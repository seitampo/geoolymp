/**
 * Знак GeoOlymp — компасная роза (stroke-SVG). Наследует цвет через currentColor,
 * размер задаётся className. Один знак на весь продукт вместо глобуса-в-квадрате.
 */
export function Compass({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.25" />
      <path d="M12 1.5v2.6M12 19.9v2.6M1.5 12h2.6M19.9 12h2.6" strokeWidth="1.2" />
      {/* Стрелка N–S: северный луч залит */}
      <path d="M12 5.4 14.1 12l-2.1 6.6L9.9 12Z" strokeWidth="1.2" />
      <path d="M12 5.4 14.1 12H9.9Z" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Тонкие горизонтали рельефа — фоновая графика для hero и пустых состояний. */
export function ContourLines({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 160"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <path d="M-10 130c60-30 90 10 150-14s90-40 150-16 80 34 120 22" />
      <path d="M-10 108c55-24 88 6 142-14s84-34 142-14 86 30 136 20" opacity="0.7" />
      <path d="M-10 86c50-20 84 4 134-12s78-28 134-12 88 26 152 18" opacity="0.5" />
      <path d="M-10 64c46-16 80 2 126-10s72-22 126-10 90 22 168 16" opacity="0.35" />
      <path d="M-10 42c42-12 76 0 118-8s66-16 118-8 92 18 184 14" opacity="0.2" />
    </svg>
  );
}
