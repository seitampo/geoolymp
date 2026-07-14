import { NextRequest } from "next/server";
import { setSession } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { getT } from "@/lib/i18n";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { clearAttempts, getClientKey, isRateLimited, rateLimitWindowMinutes, recordAttempt } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const t = await getT();
  const key = getClientKey(request, "login");

  // Защита от перебора пароля: слишком много попыток с одного адреса — временная блокировка.
  if (await isRateLimited(key)) {
    return redirectWithError(
      request,
      "/login",
      `${t("err.rateLimitLoginPre")} ${rateLimitWindowMinutes()}${t("err.rateLimitPost")}`,
    );
  }

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await verifyPassword(password, user.password))) {
    await recordAttempt(key);
    return redirectWithError(request, "/login", t("err.invalidCredentials"));
  }

  // Успешный вход сбрасывает счётчик попыток по адресу.
  await clearAttempts(key);

  const response = redirectAfterPost(request, "/dashboard");
  setSession(response, user.id);
  return response;
}
