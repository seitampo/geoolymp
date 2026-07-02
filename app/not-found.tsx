import { LinkButton } from "@/components/Button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium text-emerald-700">Ошибка 404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">Страница не найдена</h1>
      <p className="mt-3 text-gray-600">
        Страница не существует или у вас нет к ней доступа.
      </p>
      <LinkButton className="mt-6" href="/dashboard" variant="primary">
        Вернуться к группам
      </LinkButton>
    </main>
  );
}
