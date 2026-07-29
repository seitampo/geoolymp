import { Prisma, Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { issueAndSendCode } from "@/lib/emailVerification";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { getT } from "@/lib/i18n";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { isValidTeacherInvite } from "@/lib/teacherInvite";

export const runtime = "nodejs";

const MIN_PASSWORD_LENGTH = 6;
// Грубая проверка формата: атрибут type="email" работает только на клиенте,
// прямой POST в API мог сохранить любую строку вместо email.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const t = await getT();
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");
  const inviteCode = String(formData.get("inviteCode") ?? "").trim();

  if (!name || !email || !password || (role !== Role.TEACHER && role !== Role.STUDENT)) {
    return redirectWithError(request, "/register", t("err.fillAllFields"));
  }

  if (!EMAIL_PATTERN.test(email)) {
    return redirectWithError(request, "/register", t("err.enterValidEmail"));
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return redirectWithError(
      request,
      "/register",
      `${t("err.pwdLenPre")} ${MIN_PASSWORD_LENGTH}${t("err.pwdLenPost")}`,
    );
  }

  // Роль учителя выдаётся только по коду-приглашению (проверка на сервере: без неё
  // прямой POST с role=TEACHER создал бы учительский аккаунт в обход интерфейса).
  if (role === Role.TEACHER && !isValidTeacherInvite(inviteCode)) {
    return redirectWithError(request, "/register", t("err.invalidTeacherCode"));
  }

  // Занятый, но неподтверждённый адрес перезаписываем: иначе любой мог бы «застолбить»
  // чужую почту, ни разу её не открыв, и настоящий владелец не смог бы зарегистрироваться.
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing && !existing.emailVerified) {
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: { name, password: await hashPassword(password), role },
    });

    await issueAndSendCode(t, user.id, email);
    return redirectToVerification(request, email);
  }

  try {
    // Сессию не выдаём: до ввода кода из письма аккаунт неподтверждённый.
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: await hashPassword(password),
        role,
      },
    });

    await issueAndSendCode(t, user.id, email);
    return redirectToVerification(request, email);
  } catch (error) {
    // P2002 — нарушение уникальности email. Без обработки Prisma бросает 500.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return redirectWithError(request, "/register", t("err.emailTaken"));
    }
    throw error;
  }
}

function redirectToVerification(request: NextRequest, email: string) {
  return redirectAfterPost(request, `/verify?email=${encodeURIComponent(email)}`);
}
