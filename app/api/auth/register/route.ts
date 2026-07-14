import { Prisma, Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { setSession } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { getT } from "@/lib/i18n";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { isValidTeacherInvite } from "@/lib/teacherInvite";

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

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: await hashPassword(password),
        role,
      },
    });

    const response = redirectAfterPost(request, "/dashboard");
    setSession(response, user.id);
    return response;
  } catch (error) {
    // P2002 — нарушение уникальности email. Без обработки Prisma бросает 500.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return redirectWithError(request, "/register", t("err.emailTaken"));
    }
    throw error;
  }
}
