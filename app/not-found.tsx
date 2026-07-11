import { LinkButton } from "@/components/Button";
import { Compass } from "@/components/Compass";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <Compass className="mb-4 h-10 w-10 text-rust/60" />
      <p className="text-xs font-semibold uppercase tracking-wider text-rust">Ошибка 404</p>
      <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-ink">
        Вы сошли с маршрута
      </h1>
      <p className="mt-3 text-ink-soft">Страница не существует или у вас нет к ней доступа.</p>
      <LinkButton className="mt-6" href="/dashboard" variant="primary">
        Вернуться в кабинет
      </LinkButton>
    </main>
  );
}
