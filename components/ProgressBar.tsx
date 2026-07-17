/**
 * Прогресс как «линия маршрута»: пунктирная трасса из точек, пройденная часть —
 * сплошная с точкой-«остановкой» на текущей позиции. Рабочий цвет — нейви;
 * полностью пройденный маршрут (100%) становится золотым — «медаль» за финиш.
 */
export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const fill = clamped >= 100 ? "bg-gold" : "bg-navy";

  return (
    <div
      className="relative h-3"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="route-dash absolute inset-x-0 top-1/2 -translate-y-1/2 opacity-25" />
      <div
        className={`absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full ${fill}`}
        style={{ width: `${clamped}%` }}
      />
      {clamped > 0 && (
        <span
          className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm ${fill}`}
          style={{ left: `${clamped}%` }}
        />
      )}
    </div>
  );
}
