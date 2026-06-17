import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-3 text-3xl font-semibold">GeoOlymp</h1>
      <p className="mb-8 max-w-xl text-gray-700">
        Простая платформа для групп, материалов, задач и проверки решений по географии.
      </p>
      <div className="flex gap-3">
        <Link className="border border-gray-300 px-4 py-2" href="/login">
          Войти
        </Link>
        <Link className="border border-gray-300 px-4 py-2" href="/register">
          Зарегистрироваться
        </Link>
      </div>
    </main>
  );
}
