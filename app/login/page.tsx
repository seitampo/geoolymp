import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorBanner } from "@/components/ErrorBanner";
import { TextInput } from "@/components/FormFields";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-12 sm:px-0 sm:py-16">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Вход</h1>
        <p className="mt-1 text-sm text-gray-500">С возвращением в GeoOlymp</p>
      </div>
      <Card>
        <ErrorBanner message={error} />
        <form className="space-y-4" action="/api/auth/login" method="post">
          <TextInput label="Email" name="email" type="email" placeholder="you@example.com" />
          <TextInput label="Пароль" name="password" type="password" />
          <Button className="w-full">Войти</Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm text-gray-600">
        Нет аккаунта?{" "}
        <Link className="font-medium text-emerald-700 hover:text-emerald-800 hover:underline" href="/register">
          Зарегистрироваться
        </Link>
      </p>
    </main>
  );
}
