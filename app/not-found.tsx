import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <h1 className="mb-3 text-4xl font-semibold">404</h1>
      <p className="mb-6 text-gray-700">
        Страница не найдена или у вас нет к ней доступа.
      </p>
      <Link className="rounded border border-gray-300 px-4 py-2 hover:bg-gray-50" href="/dashboard">
        Вернуться к группам
      </Link>
    </main>
  );
}
