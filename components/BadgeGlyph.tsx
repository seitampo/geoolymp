import type { BadgeFamily } from "@/lib/achievements";

/**
 * Рисованные stroke-иконки семей достижений — вместо эмодзи.
 * tasks — флажок-отметка маршрута, maps — компасная стрелка-пин,
 * streak — язык пламени.
 */
export function BadgeGlyph({
  family,
  className = "h-8 w-8",
}: {
  family: BadgeFamily;
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  if (family === "tasks") {
    return (
      <svg {...common}>
        <path d="M6 21V4" />
        <path d="M6 4h11l-2.5 3.5L17 11H6" />
        <path d="m8.6 6.9 1.6 1.6 3-3.4" strokeWidth="1.4" />
      </svg>
    );
  }

  if (family === "maps") {
    return (
      <svg {...common}>
        <path d="M12 21s-6.5-5.4-6.5-10a6.5 6.5 0 0 1 13 0c0 4.6-6.5 10-6.5 10Z" />
        <path d="M12 7.2 13.6 11 12 14.8 10.4 11Z" strokeWidth="1.3" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M12 21c-3.6 0-6-2.3-6-5.4 0-2.6 1.7-4.3 3-5.9C10.3 8 11 6.4 11 4.5c2.6 1.3 4 3.4 4 5.4.8-.5 1.4-1.2 1.7-2.2 1 1.4 1.3 3 1.3 4 0 3.9-2.4 9.3-6 9.3Z" />
      <path d="M12 21c-1.5 0-2.6-1.2-2.6-2.8 0-1.5 1.1-2.3 2.6-3.8 1.5 1.5 2.6 2.3 2.6 3.8 0 1.6-1.1 2.8-2.6 2.8Z" strokeWidth="1.3" />
    </svg>
  );
}
