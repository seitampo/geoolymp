import { LinkButton } from "@/components/Button";
import { Compass } from "@/components/Compass";
import { getT } from "@/lib/i18n";

export default async function NotFound() {
  const t = await getT();

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <Compass className="mb-4 h-12 w-12" />
      <p className="text-xs font-semibold uppercase tracking-wider text-navy">{t("notFound.code")}</p>
      <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-ink">{t("notFound.title")}</h1>
      <p className="mt-3 text-ink-soft">{t("notFound.desc")}</p>
      <LinkButton className="mt-6" href="/dashboard" variant="primary">
        {t("notFound.back")}
      </LinkButton>
    </main>
  );
}
