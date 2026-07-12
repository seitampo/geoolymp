import { NextRequest } from "next/server";
import { setSession } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { clearAttempts, getClientKey, isRateLimited, rateLimitWindowMinutes, recordAttempt } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const key = getClientKey(request, "login");

  // Защита от перебора пароля: слишком много попыток с одного адреса — временная блокировка.
  if (await isRateLimited(key)) {
    return redirectWithError(
      request,
      "/login",
      `Слишком много попыток входа. Попробуйте через ${rateLimitWindowMinutes()} минут.`,
    );
  }

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await verifyPassword(password, user.password))) {
    await recordAttempt(key);
    return redirectWithError(request, "/login", "Неверный email или пароль.");
  }

  // Успешный вход сбрасывает счётчик попыток по адресу.
  await clearAttempts(key);

  const response = redirectAfterPost(request, "/dashboard");
  setSession(response, user.id);
  return response;
}
