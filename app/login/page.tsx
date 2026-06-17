import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { TextInput } from "@/components/FormFields";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Вход</h1>
      <form className="space-y-4" action="/api/auth/login" method="post">
        <TextInput label="Email" name="email" type="email" />
        <TextInput label="Пароль" name="password" type="password" />
        <button className="w-full border border-gray-300 px-4 py-2" type="submit">
          Войти
        </button>
      </form>
      <p className="mt-4 text-gray-700">
        Нет аккаунта?{" "}
        <Link className="underline" href="/register">
          Зарегистрироваться
        </Link>
      </p>
    </main>
  );
}
