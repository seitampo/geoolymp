import { NextRequest } from "next/server";
import { redirectWithError, redirectWithSuccess } from "@/lib/formResponse";
import { getT } from "@/lib/i18n";
import { sendEmail } from "@/lib/email";
import { createResetToken, resetTokenTtlMinutes } from "@/lib/passwordReset";
import { prisma } from "@/lib/prisma";
import { getClientKey, isRateLimited, rateLimitWindowMinutes, recordAttempt } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const t = await getT();
  // Ограничиваем частоту, чтобы нельзя было заваливать чужой ящик письмами.
  const key = getClientKey(request, "forgot");
  if (await isRateLimited(key)) {
    return redirectWithError(
      request,
      "/forgot-password",
      `${t("err.rateLimitForgotPre")} ${rateLimitWindowMinutes()}${t("err.rateLimitPost")}`,
    );
  }
  await recordAttempt(key);

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return redirectWithError(request, "/forgot-password", t("err.enterEmail"));
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Письмо отправляем только если пользователь есть, но ответ одинаковый в любом случае —
  // чтобы нельзя было по ответу узнать, зарегистрирован ли email.
  if (user) {
    const token = await createResetToken(user.id);
    const link = new URL(`/reset-password?token=${token}`, request.url).toString();

    await sendEmail({
      to: email,
      subject: t("email.resetSubject"),
      html: `
        <div style="font-family: sans-serif; color: #16232b;">
          <h2>${t("email.resetHeading")}</h2>
          <p>${t("email.resetIntro")}</p>
          <p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#b0380f;color:#fff;text-decoration:none;border-radius:6px;">${t("email.resetButton")}</a></p>
          <p style="color:#5b6b73;font-size:14px;">${t("email.resetTtlPre")} ${resetTokenTtlMinutes()} ${t("email.resetTtlPost")}</p>
        </div>
      `,
    });
  }

  return redirectWithSuccess(request, "/forgot-password", t("ok.forgotSent"));
}
