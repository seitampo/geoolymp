/**
 * Отправка писем. Провайдер сменный, потому что от него зависит, кому вообще можно
 * писать:
 *  - Brevo разрешает подтвердить один ящик (личный gmail) и слать с него кому угодно —
 *    работает без своего домена, поэтому это стартовый вариант;
 *  - Resend требует подтверждённый домен, зато письма идут с адреса вида
 *    noreply@домен — на него переходим, когда домен появится.
 *
 * Провайдер выбирается по заданному ключу, менять код для перехода не нужно.
 * Если ключа нет — письмо не уходит, но запрос не падает: вызывающий код не
 * раскрывает пользователю, существует ли адрес (защита от перебора почт).
 */

type EmailOptions = { to: string; subject: string; html: string };

/**
 * Отправитель в формате «Имя <адрес>». Адрес должен быть подтверждён у провайдера,
 * иначе письма не уйдут — у Brevo это конкретный ящик, у Resend любой на домене.
 */
function sender(): { name: string; email: string } {
  const raw = process.env.EMAIL_FROM || process.env.RESEND_FROM || "Olympic Meridian <onboarding@resend.dev>";
  const match = raw.match(/^\s*(.*?)\s*<\s*([^>\s]+)\s*>\s*$/);

  if (match) {
    return { name: match[1] || "Olympic Meridian", email: match[2] };
  }

  // Значение без угловых скобок — считаем, что задан голый адрес.
  return { name: "Olympic Meridian", email: raw.trim() };
}

async function sendViaBrevo(apiKey: string, options: EmailOptions): Promise<boolean> {
  const from = sender();
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: from,
      to: [{ email: options.to }],
      subject: options.subject,
      htmlContent: options.html,
    }),
  });

  if (!response.ok) {
    console.error("Brevo вернул ошибку:", response.status, await response.text().catch(() => ""));
    return false;
  }
  return true;
}

async function sendViaResend(apiKey: string, options: EmailOptions): Promise<boolean> {
  const from = sender();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${from.name} <${from.email}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    }),
  });

  if (!response.ok) {
    console.error("Resend вернул ошибку:", response.status, await response.text().catch(() => ""));
    return false;
  }
  return true;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const brevoKey = process.env.BREVO_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  try {
    if (brevoKey) {
      return await sendViaBrevo(brevoKey, options);
    }

    if (resendKey) {
      return await sendViaResend(resendKey, options);
    }

    console.warn("Ключ почтового провайдера не задан — письмо не отправлено:", options.subject);
    return false;
  } catch (error) {
    console.error("Не удалось отправить письмо:", error);
    return false;
  }
}
