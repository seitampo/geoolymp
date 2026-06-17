import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!name || !email || !password || (role !== Role.TEACHER && role !== Role.STUDENT)) {
    return NextResponse.json({ error: "Заполните все поля." }, { status: 400 });
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: await hashPassword(password),
      role,
    },
  });

  const response = NextResponse.redirect(new URL("/dashboard", request.url), 303);
  setSession(response, user.id);
  return response;
}
