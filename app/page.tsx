import { redirect } from "next/navigation";
import { LinkButton } from "@/components/Button";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
        <svg
          className="h-8 w-8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c2.6 2.6 2.6 15.4 0 18M12 3c-2.6 2.6-2.6 15.4 0 18" />
        </svg>
      </span>
      <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900">GeoOlymp</h1>
      <p className="mt-4 max-w-md text-base text-gray-600">
        Платформа подготовки к олимпиадам по географии: группы, материалы, задачи и проверка
        решений — в одном месте.
      </p>
      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <LinkButton href="/register" variant="primary">
          Зарегистрироваться
        </LinkButton>
        <LinkButton href="/login" variant="secondary">
          Войти
        </LinkButton>
      </div>
    </main>
  );
}
