/**
 * Прогресс как «линия маршрута»: пунктирная трасса из точек, пройденная часть —
 * сплошная терракотовая с точкой-«остановкой» на текущей позиции.
 */
export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div
      className="relative h-3"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="route-dash absolute inset-x-0 top-1/2 -translate-y-1/2 opacity-30" />
      <div
        className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-rust"
        style={{ width: `${clamped}%` }}
      />
      {clamped > 0 && (
        <span
          className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-rust shadow-sm"
          style={{ left: `${clamped}%` }}
        />
      )}
    </div>
  );
}
