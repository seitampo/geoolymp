import { randomBytes } from "crypto";
import { prisma } from "./prisma";

/** Срок жизни ссылки восстановления пароля. */
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 час

/** Создаёт одноразовый токен сброса пароля для пользователя. */
export async function createResetToken(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: { token, userId, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });
  return token;
}

/**
 * Проверяет и «гасит» токен: возвращает userId, если токен валиден (существует,
 * не использован, не истёк), иначе null. Повторное применение того же токена вернёт null.
 */
export async function consumeResetToken(token: string): Promise<number | null> {
  if (!token) {
    return null;
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }

  await prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return record.userId;
}

export function resetTokenTtlMinutes(): number {
  return Math.round(TOKEN_TTL_MS / 60000);
}
