/**
 * Глобальный скелетон загрузки: на медленной базе переходы раньше выглядели
 * как «зависание» без индикации. Показывается для всех маршрутов.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6" aria-busy="true" aria-label="Загрузка">
      <div className="h-7 w-56 animate-pulse rounded-md bg-ink/10" />
      <div className="route-dash mt-4 w-24 opacity-40" />
      <div className="mt-8 space-y-4">
        <div className="h-28 animate-pulse rounded-lg border border-line bg-white" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-36 animate-pulse rounded-lg border border-line bg-white" />
          <div className="h-36 animate-pulse rounded-lg border border-line bg-white [animation-delay:150ms]" />
        </div>
        <div className="h-28 animate-pulse rounded-lg border border-line bg-white [animation-delay:300ms]" />
      </div>
    </div>
  );
}
