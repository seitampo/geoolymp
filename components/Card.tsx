import type { ReactNode } from "react";

/** Экспортируется отдельно, чтобы карточкой мог быть любой элемент (form, article, Link). */
export const cardClasses = "rounded-xl border border-gray-200 bg-white p-5 shadow-sm";

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`${cardClasses} ${className}`}>{children}</div>;
}
