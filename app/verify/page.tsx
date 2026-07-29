import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Compass } from "@/components/Compass";
import { ErrorBanner, SuccessBanner } from "@/components/ErrorBanner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { verificationCodeTtlMinutes } from "@/lib/emailVerification";
import { getLocale, getT } from "@/lib/i18n";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string; ok?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const { email, error, ok } = await searchParams;
  const t = await getT();
  const locale = await getLocale();

  // Без адреса подтверждать нечего — отправляем на вход.
  if (!email) {
    redirect("/login");
  }

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-12 sm:px-0 sm:py-16">
      <div className="mb-4 flex justify-end">
        <LanguageSwitcher locale={locale} aria={t("lang.aria")} />
      </div>
      <div className="mb-6 text-center">
        <Compass className="mx-auto mb-3 h-16 w-16" />
        <h1 className="font-heading text-xl font-semibold tracking-tight text-ink">{t("verify.title")}</h1>
        <p className="mt-1 text-sm text-ink-mute">
          {t("verify.subtitlePre")} <span className="font-medium text-ink">{email}</span>
        </p>
      </div>
      <Card>
        <ErrorBanner message={error} />
        <SuccessBanner message={ok} />
        <form className="space-y-4" action="/api/auth/verify" method="post">
          <input type="hidden" name="email" value={email} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="code">
              {t("verify.codeLabel")}
            </label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              placeholder="000000"
              className="w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-center font-heading text-2xl tracking-[0.4em] text-ink shadow-sm transition-colors placeholder:text-ink-mute/40 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
            />
            <p className="mt-1.5 text-xs text-ink-mute">
              {t("verify.ttlPre")} {verificationCodeTtlMinutes()} {t("verify.ttlPost")}
            </p>
          </div>
          <Button className="w-full">{t("verify.submit")}</Button>
        </form>
      </Card>

      <form className="mt-4 text-center" action="/api/auth/verify/resend" method="post">
        <input type="hidden" name="email" value={email} />
        <button className="text-sm font-medium text-navy hover:underline" type="submit">
          {t("verify.resend")}
        </button>
      </form>

      <p className="mt-3 text-center text-xs text-ink-mute">{t("verify.spamHint")}</p>

      <p className="mt-4 text-center text-sm text-ink-soft">
        <Link className="font-medium text-navy hover:underline" href="/login">
          {t("common.backToLogin")}
        </Link>
      </p>
    </main>
  );
}
