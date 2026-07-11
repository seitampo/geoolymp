import { redirect } from "next/navigation";
import { LinkButton } from "@/components/Button";
import { Compass, ContourLines } from "@/components/Compass";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col justify-center overflow-hidden px-6 py-16">
      <ContourLines className="pointer-events-none absolute inset-x-0 top-0 h-56 w-full text-ink/10" />

      <div className="relative">
        <div className="flex items-center gap-2 text-rust">
          <Compass className="h-9 w-9" />
          <span className="font-heading text-sm font-semibold tracking-wide text-ink">GeoOlymp</span>
        </div>

        <h1 className="mt-8 max-w-2xl font-heading text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
          От школьной олимпиады —
          <br />
          до международной
        </h1>
        <div className="route-dash mt-5 w-24" />

        <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft">
          Подготовка школьников Казахстана к олимпиадам по географии: группы с учителем,
          задачи с автопроверкой, интерактивные карты и тренировки на время.
        </p>

        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <LinkButton href="/register" variant="primary">
            Начать заниматься
          </LinkButton>
          <LinkButton href="/login" variant="secondary">
            Войти
          </LinkButton>
        </div>

        <dl className="mt-14 grid gap-6 border-t border-line pt-8 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-rust">Картозадачи</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              «Отметьте озеро Балхаш» — ответ кликом по карте, проверка мгновенная.
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-rust">Тренировки на время</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              Режим контеста: таймер, одна попытка и разбор ошибок после финиша.
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-rust">Прогресс виден</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              Учитель видит, кто что решил; ученик копит стрики и значки.
            </dd>
          </div>
        </dl>
      </div>
    </main>
  );
}
