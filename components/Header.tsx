import Link from "next/link";
import { User } from "@prisma/client";
import { Button } from "@/components/Button";

export function Header({ user }: { user: User }) {
  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2 text-lg font-semibold text-gray-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18" />
              <path d="M12 3c2.6 2.6 2.6 15.4 0 18M12 3c-2.6 2.6-2.6 15.4 0 18" />
            </svg>
          </span>
          GeoOlymp
        </Link>
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="min-w-0 text-right leading-tight">
            <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.role === "TEACHER" ? "Учитель" : "Ученик"}</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <Button variant="secondary" size="sm">
              Выйти
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
