import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await verifyPassword(password, user.password))) {
    return NextResponse.json({ error: "Неверный email или пароль." }, { status: 401 });
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url), 303);
  setSession(response, user.id);
  return response;
}
