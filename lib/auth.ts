import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "./prisma";

const cookieName = "geoolymp_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 дней

function getSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    // В продакшене нельзя молча использовать общеизвестный секрет — иначе подпись
    // сессионных cookie подделывается кем угодно. Падаем явно.
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set in production.");
    }
    return "local-development-secret";
  }

  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createSessionCookie(userId: number) {
  // Срок действия зашит в подписанный payload и проверяется на сервере, поэтому
  // украденный cookie перестаёт работать по истечении срока, а не живёт вечно.
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function readUserIdFromCookie(value?: string) {
  if (!value) {
    return null;
  }

  const parts = value.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [rawUserId, rawExpiry, signature] = parts;
  const payload = `${rawUserId}.${rawExpiry}`;
  const expectedSignature = sign(payload);
  const given = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }

  const userId = Number(rawUserId);
  const expiresAt = Number(rawExpiry);

  if (!Number.isInteger(userId) || !Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return null;
  }

  return userId;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = readUserIdFromCookie(cookieStore.get(cookieName)?.value);

  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({ where: { id: userId } });
}

export function setSession(response: NextResponse, userId: number) {
  response.cookies.set(cookieName, createSessionCookie(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSession(response: NextResponse) {
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentUserFromRequest(request: NextRequest) {
  const userId = readUserIdFromCookie(request.cookies.get(cookieName)?.value);

  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({ where: { id: userId } });
}
