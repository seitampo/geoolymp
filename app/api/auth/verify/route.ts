import { NextRequest } from "next/server";
import { setSession } from "@/lib/auth";
import { verifyCode } from "@/lib/emailVerification";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { getT } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { getClientKey, isRateLimited, rateLimitWindowMinutes, recordAttempt } from "@/lib/rateLimit";

export const runtime = "nodejs";

/** Ввод кода из письма. При успехе аккаунт подтверждается и сразу выдаётся сессия. */
export async function POST(request: NextRequest) {
  const t = await getT();
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const code = String(formData.get("code") ?? "").trim();
  const backTo = `/verify?email=${encodeURIComponent(email)}`;

  // Счётчик попыток в самом коде защищает один код, а этот лимит — от перебора
  // по многим адресам с одного адреса.
  const key = getClientKey(request, "verify");
  if (await isRateLimited(key)) {
    return redirectWithError(
      request,
      backTo,
      `${t("err.rateLimitVerifyPre")} ${rateLimitWindowMinutes()}${t("err.rateLimitPost")}`,
    );
  }

  if (!email || !code) {
    return redirectWithError(request, backTo, t("err.enterCode"));
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Подтверждать нечего: адреса нет или он уже подтверждён — ведём на вход,
  // не раскрывая, что именно из двух.
  if (!user || user.emailVerified) {
    return redirectAfterPost(request, "/login");
  }

  const result = await verifyCode(user.id, code);

  if (result !== "ok") {
    await recordAttempt(key);
  }

  if (result === "expired") {
    return redirectWithError(request, backTo, t("err.codeExpired"));
  }

  if (result === "too-many-attempts") {
    return redirectWithError(request, backTo, t("err.codeTooManyAttempts"));
  }

  if (result === "wrong") {
    return redirectWithError(request, backTo, t("err.codeWrong"));
  }

  const response = redirectAfterPost(request, "/dashboard");
  setSession(response, user.id);
  return response;
}
