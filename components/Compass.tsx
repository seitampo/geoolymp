/**
 * Эмблема Olympic Meridian — фирменный знак (глобус с золотым меридианом, компасная
 * звезда и книга). Растровый логотип с прозрачным фоном лежит в /public/logo.png,
 * размер задаётся className. Имя Compass историческое: раньше знаком была компасная роза.
 */
export function Compass({ className = "h-6 w-6" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" alt="" aria-hidden="true" className={`${className} object-contain`} />;
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
