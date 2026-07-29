import { randomInt } from "crypto";
import { sendEmail } from "./email";
import type { TFunction } from "./i18n";
import { hashPassword, verifyPassword } from "./password";
import { prisma } from "./prisma";

/** Сколько живёт код из письма. Короткий срок — часть защиты от подбора. */
const CODE_TTL_MS = 15 * 60 * 1000;

/**
 * Сколько раз можно ошибиться, прежде чем код сгорит. Шесть цифр перебираются
 * мгновенно, если попытки не считать, поэтому лимит здесь обязателен.
 */
const MAX_ATTEMPTS = 5;

export function verificationCodeTtlMinutes(): number {
  return Math.round(CODE_TTL_MS / 60000);
}

/** Шестизначный код. randomInt, а не Math.random: код — это ключ от аккаунта. */
function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Выпускает новый код: прежние коды пользователя гасит, чтобы работал ровно один
 * (иначе повторная отправка оставляла бы в живых несколько кодов сразу).
 * Возвращает код открытым текстом — его отправляет письмом вызывающий роут.
 */
export async function createVerificationCode(userId: number): Promise<string> {
  const code = generateCode();

  await prisma.$transaction([
    prisma.emailVerificationCode.deleteMany({ where: { userId } }),
    prisma.emailVerificationCode.create({
      data: {
        userId,
        codeHash: await hashPassword(code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    }),
  ]);

  return code;
}

export type VerifyCodeResult = "ok" | "wrong" | "expired" | "too-many-attempts";

/**
 * Проверяет код и при успехе подтверждает аккаунт. Неудачные попытки считаются:
 * после MAX_ATTEMPTS код перестаёт приниматься и нужен новый.
 */
export async function verifyCode(userId: number, code: string): Promise<VerifyCodeResult> {
  const record = await prisma.emailVerificationCode.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (!record || record.expiresAt < new Date()) {
    return "expired";
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return "too-many-attempts";
  }

  // Счётчик увеличиваем до сравнения: иначе прерванный запрос давал бы
  // бесплатную попытку.
  await prisma.emailVerificationCode.update({
    where: { id: record.id },
    data: { attempts: { increment: 1 } },
  });

  if (!(await verifyPassword(code.trim(), record.codeHash))) {
    return "wrong";
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { emailVerified: true } }),
    prisma.emailVerificationCode.deleteMany({ where: { userId } }),
  ]);

  return "ok";
}

/**
 * Выпускает код и отправляет письмо. Общая точка для регистрации и повторной
 * отправки, чтобы текст письма не разъезжался между ними.
 *
 * Если письмо не ушло (локально провайдер не настроен), код печатается в консоль
 * сервера — иначе пройти регистрацию на своей машине невозможно. В продакшене
 * не печатается никогда.
 */
export async function issueAndSendCode(t: TFunction, userId: number, email: string): Promise<void> {
  const code = await createVerificationCode(userId);

  const sent = await sendEmail({
    to: email,
    subject: t("email.verifySubject"),
    html: `
      <div style="font-family: sans-serif; color: #16232b;">
        <h2>${t("email.verifyHeading")}</h2>
        <p>${t("email.verifyIntro")}</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:6px;color:#1c3a5a;margin:24px 0;">${code}</p>
        <p style="color:#5b6b73;font-size:14px;">${t("email.verifyTtlPre")} ${verificationCodeTtlMinutes()} ${t("email.verifyTtlPost")}</p>
      </div>
    `,
  });

  if (!sent && process.env.NODE_ENV !== "production") {
    console.info(`[dev] Код подтверждения для ${email}: ${code}`);
  }
}
