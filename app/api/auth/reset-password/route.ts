import { NextRequest } from "next/server";
import { redirectWithError, redirectWithSuccess } from "@/lib/formResponse";
import { getT } from "@/lib/i18n";
import { hashPassword } from "@/lib/password";
import { consumeResetToken } from "@/lib/passwordReset";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MIN_PASSWORD_LENGTH = 6;

export async function POST(request: NextRequest) {
  const t = await getT();
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!token) {
    return redirectWithError(request, "/login", t("err.linkInvalid"));
  }

  // Длину проверяем до «гашения» токена, чтобы при коротком пароле ссылка осталась рабочей.
  if (password.length < MIN_PASSWORD_LENGTH) {
    return redirectWithError(
      request,
      `/reset-password?token=${token}`,
      `${t("err.pwdLenPre")} ${MIN_PASSWORD_LENGTH}${t("err.pwdLenPost")}`,
    );
  }

  const userId = await consumeResetToken(token);
  if (userId === null) {
    return redirectWithError(request, "/login", t("err.linkInvalidRequestNew"));
  }

  await prisma.user.update({
    where: { id: userId },
    data: { password: await hashPassword(password) },
  });

  return redirectWithSuccess(request, "/login", t("ok.passwordChanged"));
}
