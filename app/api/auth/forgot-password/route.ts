import { NextRequest } from "next/server";
import { redirectWithError, redirectWithSuccess } from "@/lib/formResponse";
import { sendEmail } from "@/lib/email";
import { createResetToken, resetTokenTtlMinutes } from "@/lib/passwordReset";
import { prisma } from "@/lib/prisma";
import { getClientKey, isRateLimited, rateLimitWindowMinutes, recordAttempt } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Ограничиваем частоту, чтобы нельзя было заваливать чужой ящик письмами.
  const key = getClientKey(request, "forgot");
  if (await isRateLimited(key)) {
    return redirectWithError(
      request,
      "/forgot-password",
      `Слишком много запросов. Попробуйте через ${rateLimitWindowMinutes()} минут.`,
    );
  }
  await recordAttempt(key);

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return redirectWithError(request, "/forgot-password", "Введите email.");
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Письмо отправляем только если пользователь есть, но ответ одинаковый в любом случае —
  // чтобы нельзя было по ответу узнать, зарегистрирован ли email.
  if (user) {
    const token = await createResetToken(user.id);
    const link = new URL(`/reset-password?token=${token}`, request.url).toString();

    await sendEmail({
      to: email,
      subject: "Восстановление пароля — Olympic Meridian",
      html: `
        <div style="font-family: sans-serif; color: #16232b;">
          <h2>Восстановление пароля</h2>
          <p>Вы запросили сброс пароля в Olympic Meridian. Нажмите на ссылку ниже, чтобы задать новый пароль:</p>
          <p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#b0380f;color:#fff;text-decoration:none;border-radius:6px;">Сбросить пароль</a></p>
          <p style="color:#5b6b73;font-size:14px;">Ссылка действует ${resetTokenTtlMinutes()} минут. Если вы не запрашивали сброс — просто проигнорируйте это письмо.</p>
        </div>
      `,
    });
  }

  return redirectWithSuccess(
    request,
    "/forgot-password",
    "Если аккаунт с таким email существует, мы отправили письмо со ссылкой для сброса пароля.",
  );
}
