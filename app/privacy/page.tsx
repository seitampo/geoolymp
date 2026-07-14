import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getLocale, getT } from "@/lib/i18n";
import { getPrivacyContent } from "@/lib/legal/privacy";

// Публичная юридическая страница: доступна без входа. Язык — из cookie locale.
export default async function PrivacyPage() {
  const t = await getT();
  const locale = await getLocale();
  const content = getPrivacyContent(locale);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-6 flex items-center justify-between gap-2">
        <Link
          className="inline-flex items-center gap-1 text-sm text-ink-mute transition-colors hover:text-ink"
          href="/"
        >
          <span aria-hidden="true">←</span> {t("privacy.back")}
        </Link>
        <LanguageSwitcher locale={locale} aria={t("lang.aria")} />
      </div>

      <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">{t("privacy.title")}</h1>
      <p className="mt-1 text-xs text-ink-mute">
        {t("privacy.updatedPre")} {content.updated}
      </p>

      <p className="mt-6 text-sm leading-relaxed text-ink-soft">{content.intro}</p>

      <div className="mt-8 space-y-8">
        {content.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-heading text-[15px] font-semibold text-ink">{section.heading}</h2>
            <div className="mt-2 space-y-2">
              {section.body.map((paragraph, index) => (
                <p key={index} className="text-sm leading-relaxed text-ink-soft">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
