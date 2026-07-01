import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ErrorBanner } from "@/components/ErrorBanner";
import { TextInput } from "@/components/FormFields";

export default async function RegisterPage({
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
    <main className="mx-auto max-w-sm px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Регистрация</h1>
      <ErrorBanner message={error} />
      <form className="space-y-4" action="/api/auth/register" method="post">
        <TextInput label="Имя" name="name" />
        <TextInput label="Email" name="email" type="email" />
        <TextInput label="Пароль" name="password" type="password" />
        <label className="block">
          <span className="mb-1 block text-gray-700">Роль</span>
          <select className="w-full border border-gray-300 px-3 py-2" name="role" required>
            <option value="TEACHER">Учитель</option>
            <option value="STUDENT">Ученик</option>
          </select>
        </label>
        <button className="w-full border border-gray-300 px-4 py-2" type="submit">
          Создать аккаунт
        </button>
      </form>
      <p className="mt-4 text-gray-700">
        Уже есть аккаунт?{" "}
        <Link className="underline" href="/login">
          Войти
        </Link>
      </p>
    </main>
  );
}
