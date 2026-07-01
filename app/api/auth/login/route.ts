import { NextRequest } from "next/server";
import { setSession } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await verifyPassword(password, user.password))) {
    return redirectWithError(request, "/login", "Неверный email или пароль.");
  }

  const response = redirectAfterPost(request, "/dashboard");
  setSession(response, user.id);
  return response;
}
