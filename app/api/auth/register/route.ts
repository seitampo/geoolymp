import { Prisma, Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { setSession } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const MIN_PASSWORD_LENGTH = 6;
// Грубая проверка формата: атрибут type="email" работает только на клиенте,
// прямой POST в API мог сохранить любую строку вместо email.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!name || !email || !password || (role !== Role.TEACHER && role !== Role.STUDENT)) {
    return redirectWithError(request, "/register", "Заполните все поля.");
  }

  if (!EMAIL_PATTERN.test(email)) {
    return redirectWithError(request, "/register", "Введите корректный email.");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return redirectWithError(request, "/register", `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов.`);
  }

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: await hashPassword(password),
        role,
      },
    });

    const response = redirectAfterPost(request, "/dashboard");
    setSession(response, user.id);
    return response;
  } catch (error) {
    // P2002 — нарушение уникальности email. Без обработки Prisma бросает 500.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return redirectWithError(request, "/register", "Пользователь с таким email уже существует.");
    }
    throw error;
  }
}
