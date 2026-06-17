import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "./prisma";

const cookieName = "geoolymp_session";

function getSecret() {
  return process.env.AUTH_SECRET ?? "local-development-secret";
}

function signUserId(userId: number) {
  return createHmac("sha256", getSecret()).update(String(userId)).digest("hex");
}

export function createSessionCookie(userId: number) {
  return `${userId}.${signUserId(userId)}`;
}

export function readUserIdFromCookie(value?: string) {
  if (!value) {
    return null;
  }

  const [rawUserId, signature] = value.split(".");
  const userId = Number(rawUserId);

  if (!Number.isInteger(userId) || !signature) {
    return null;
  }

  const expectedSignature = signUserId(userId);
  const given = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
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
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export function clearSession(response: NextResponse) {
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
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
