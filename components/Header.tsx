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
    <header className="sticky top-0 z-10 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-2 font-heading text-base font-semibold tracking-tight text-ink"
        >
          <Compass className="h-7 w-7 text-rust" />
          Olympic Meridian
        </Link>
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          {user.role === "STUDENT" && (
            <Link
              href="/achievements"
              className="hidden shrink-0 text-sm font-medium text-ink-soft transition-colors hover:text-rust sm:inline"
            >
              {t("common.achievements")}
            </Link>
          )}
          <LanguageSwitcher locale={locale} aria={t("lang.aria")} />
          <div className="min-w-0 text-right leading-tight">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <p className="text-xs text-ink-mute">
              {user.role === "TEACHER" ? t("common.teacher") : t("common.student")}
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
