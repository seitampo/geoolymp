import Link from "next/link";
import type { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";
type ButtonSize = "md" | "sm";

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";

// Нейви-заливка (белый текст на #1c3a5a — контраст > 4.5:1),
// второстепенная — чернильный контур, опасная — красный контур.
const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-navy text-white hover:bg-navy-deep active:bg-navy-deep",
  secondary: "border border-ink/25 bg-white text-ink hover:border-ink/50 hover:bg-paper",
  danger: "border border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "px-4 py-2 text-sm",
  sm: "px-3 py-1.5 text-xs",
};

export function buttonClasses(variant: ButtonVariant, size: ButtonSize = "md") {
  return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`;
}

export function Button({
  variant = "primary",
  size = "md",
  type = "submit",
  className = "",
  children,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: "submit" | "button";
  className?: string;
  children: ReactNode;
}) {
  return (
    <button className={`${buttonClasses(variant, size)} ${className}`} type={type}>
      {children}
    </button>
  );
}

/** Кнопка-ссылка для внутренней навигации (через next/link). */
export function LinkButton({
  href,
  variant = "secondary",
  size = "md",
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link className={`${buttonClasses(variant, size)} ${className}`} href={href}>
      {children}
    </Link>
  );
}

/** Кнопка-ссылка для файловых API-роутов и внешних адресов (обычный <a>, без prefetch). */
export function AnchorButton({
  href,
  variant = "secondary",
  size = "md",
  newTab = false,
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  newTab?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      className={`${buttonClasses(variant, size)} ${className}`}
      href={href}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  );
}
