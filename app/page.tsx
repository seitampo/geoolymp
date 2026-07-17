import Link from "next/link";
import { redirect } from "next/navigation";
import { LinkButton } from "@/components/Button";
import { Compass, ContourLines } from "@/components/Compass";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getCurrentUser } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const t = await getT();
  const locale = await getLocale();

  return (
    <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col justify-center overflow-hidden px-6 py-16">
      <ContourLines className="pointer-events-none absolute inset-x-0 top-0 h-56 w-full text-ink/10" />

      <div className="absolute right-6 top-6 z-10">
        <LanguageSwitcher locale={locale} aria={t("lang.aria")} />
      </div>

      <div className="relative">
        <div className="flex items-center gap-2.5">
          <Compass className="h-11 w-11" />
          <span className="font-heading text-sm font-semibold tracking-wide text-ink">Olympic Meridian</span>
        </div>

        <h1 className="mt-8 max-w-2xl font-heading text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
          {t("landing.heroLine1")}
          <br />
          {t("landing.heroLine2")}
        </h1>
        <div className="route-dash mt-5 w-24" />

        <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft">{t("landing.subtitle")}</p>

        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <LinkButton href="/register" variant="primary">
            {t("landing.ctaStart")}
          </LinkButton>
          <LinkButton href="/login" variant="secondary">
            {t("common.login")}
          </LinkButton>
        </div>

        <dl className="mt-14 grid gap-6 border-t border-line pt-8 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-navy">{t("landing.feature1Title")}</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-ink-soft">{t("landing.feature1Desc")}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-navy">{t("landing.feature2Title")}</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-ink-soft">{t("landing.feature2Desc")}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-navy">{t("landing.feature3Title")}</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-ink-soft">{t("landing.feature3Desc")}</dd>
          </div>
        </dl>

        <footer className="mt-12 border-t border-line pt-6 text-sm text-ink-mute">
          <Link className="transition-colors hover:text-ink" href="/privacy">
            {t("privacy.link")}
          </Link>
        </footer>
      </div>
    </main>
  );
}
