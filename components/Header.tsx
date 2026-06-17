import Link from "next/link";
import { User } from "@prisma/client";

export function Header({ user }: { user: User }) {
  return (
    <header className="border-b border-gray-200">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="text-lg font-semibold">
          GeoOlymp
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-gray-700">
            {user.name} · {user.role === "TEACHER" ? "Учитель" : "Ученик"}
          </span>
          <form action="/api/auth/logout" method="post">
            <button className="border border-gray-300 px-3 py-1" type="submit">
              Выйти
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
