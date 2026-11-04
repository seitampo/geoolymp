import Link from "next/link";
import { User } from "@prisma/client";
import { Button } from "@/components/Button";
import { Compass } from "@/components/Compass";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getLocale, getT } from "@/lib/i18n";

export async function Header({ user }: { user: User }) {
  const t = await getT();
  const locale = await getLocale();

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-white/85 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6">
        <Link
          href="/dashboard"
          className="flex min-w-0 items-center gap-2 font-heading text-sm font-semibold tracking-tight text-ink sm:text-base"
        >
          <Compass className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
          <span className="truncate">Olympic Meridian</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          {user.role === "STUDENT" && (
            <Link
              href="/achievements"
              className="hidden shrink-0 text-sm font-medium text-ink-soft transition-colors hover:text-navy sm:inline"
            >
              {t("common.achievements")}
            </Link>
          )}
          <LanguageSwitcher locale={locale} aria={t("lang.aria")} />
          <div className="hidden min-w-0 text-right leading-tight md:block">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <p className="text-xs text-ink-mute">
              {user.role === "TEACHER"
                ? t("common.teacher")
                : t("common.student")}
            </p>
          </div>
          <form action="/api/auth/logout" method="post">
            <Button variant="secondary" size="sm">
              {t("common.logout")}
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
