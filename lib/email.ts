/**
 * Отправка писем через Resend (HTTP API, без SDK). Если ключ не задан — письмо не
 * уходит, но это не роняет запрос: вызывающий код не раскрывает пользователю, было ли
 * письмо отправлено (защита от перебора существующих email).
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY не задан — письмо не отправлено:", options.subject);
    return false;
  }

  // Без верифицированного домена Resend разрешает слать только с onboarding@resend.dev
  // и только на email владельца аккаунта. После верификации geoolymp.kz — задать RESEND_FROM.
  const from = process.env.RESEND_FROM || "Olympic Meridian <onboarding@resend.dev>";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: options.to, subject: options.subject, html: options.html }),
    });

    if (!response.ok) {
      console.error("Resend вернул ошибку:", response.status, await response.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (error) {
    console.error("Не удалось отправить письмо:", error);
    return false;
  }
}
