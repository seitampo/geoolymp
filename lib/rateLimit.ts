import { NextRequest } from "next/server";
import { prisma } from "./prisma";

/**
 * Простой rate limit на базе Neon (работает на serverless, где память между
 * инстансами не общая). Считаем попытки по ключу scope:IP в скользящем окне.
 */
const WINDOW_MS = 15 * 60 * 1000; // 15 минут
const MAX_ATTEMPTS = 10;

/** Ключ ограничения: источник запроса. За прокси Vercel IP — в x-forwarded-for. */
export function getClientKey(request: NextRequest, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  return `${scope}:${ip}`;
}

/** Достигнут ли лимит попыток по ключу за окно. */
export async function isRateLimited(key: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const count = await prisma.loginAttempt.count({ where: { key, createdAt: { gte: since } } });
  return count >= MAX_ATTEMPTS;
}

/** Регистрирует неудачную попытку и попутно чистит устаревшие записи по ключу. */
export async function recordAttempt(key: string): Promise<void> {
  const cutoff = new Date(Date.now() - WINDOW_MS);
  await prisma.$transaction([
    prisma.loginAttempt.create({ data: { key } }),
    prisma.loginAttempt.deleteMany({ where: { key, createdAt: { lt: cutoff } } }),
  ]);
}

/** Сбрасывает счётчик после успешного входа. */
export async function clearAttempts(key: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { key } });
}

/** Минут в окне — для текста сообщения пользователю. */
export function rateLimitWindowMinutes(): number {
  return Math.round(WINDOW_MS / 60000);
}
