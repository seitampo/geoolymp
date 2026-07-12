import { NextRequest } from "next/server";
import { redirectWithError, redirectWithSuccess } from "@/lib/formResponse";
import { hashPassword } from "@/lib/password";
import { consumeResetToken } from "@/lib/passwordReset";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MIN_PASSWORD_LENGTH = 6;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!token) {
    return redirectWithError(request, "/login", "Ссылка недействительна или устарела.");
  }

  // Длину проверяем до «гашения» токена, чтобы при коротком пароле ссылка осталась рабочей.
  if (password.length < MIN_PASSWORD_LENGTH) {
    return redirectWithError(
      request,
      `/reset-password?token=${token}`,
      `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов.`,
    );
  }

  const userId = await consumeResetToken(token);
  if (userId === null) {
    return redirectWithError(request, "/login", "Ссылка недействительна или устарела. Запросите новую.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { password: await hashPassword(password) },
  });

  return redirectWithSuccess(request, "/login", "Пароль изменён. Войдите с новым паролем.");
}
