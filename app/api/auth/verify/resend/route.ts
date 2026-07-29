import { NextRequest } from "next/server";
import { issueAndSendCode } from "@/lib/emailVerification";
import { redirectWithError, redirectWithSuccess } from "@/lib/formResponse";
import { getT } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { getClientKey, isRateLimited, rateLimitWindowMinutes, recordAttempt } from "@/lib/rateLimit";

export const runtime = "nodejs";

/** Отправка кода заново — ограничена, чтобы кнопкой нельзя было завалить чужой ящик. */
export async function POST(request: NextRequest) {
  const t = await getT();
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const backTo = `/verify?email=${encodeURIComponent(email)}`;

  const key = getClientKey(request, "verify-resend");
  if (await isRateLimited(key)) {
    return redirectWithError(
      request,
      backTo,
      `${t("err.rateLimitResendPre")} ${rateLimitWindowMinutes()}${t("err.rateLimitPost")}`,
    );
  }
  await recordAttempt(key);

  const user = await prisma.user.findUnique({ where: { email } });

  // Код выпускаем только для существующего неподтверждённого аккаунта, но ответ
  // одинаковый в любом случае — иначе страница подтверждения станет способом
  // проверять, зарегистрирован ли адрес.
  if (user && !user.emailVerified) {
    await issueAndSendCode(t, user.id, email);
  }

  return redirectWithSuccess(request, backTo, t("ok.codeResent"));
}
