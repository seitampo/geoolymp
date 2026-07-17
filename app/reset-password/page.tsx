import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Compass } from "@/components/Compass";
import { ErrorBanner } from "@/components/ErrorBanner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PasswordInput } from "@/components/PasswordInput";
import { getLocale, getT } from "@/lib/i18n";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const { token, error } = await searchParams;
  const t = await getT();
  const locale = await getLocale();

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-12 sm:px-0 sm:py-16">
      <div className="mb-4 flex justify-end">
        <LanguageSwitcher locale={locale} aria={t("lang.aria")} />
      </div>
      <div className="mb-6 text-center">
        <Compass className="mx-auto mb-3 h-16 w-16" />
        <h1 className="font-heading text-xl font-semibold tracking-tight text-ink">{t("reset.title")}</h1>
        <p className="mt-1 text-sm text-ink-mute">{t("reset.subtitle")}</p>
      </div>
      <Card>
        <ErrorBanner message={error} />
        {token ? (
          <form className="space-y-4" action="/api/auth/reset-password" method="post">
            <input type="hidden" name="token" value={token} />
            <PasswordInput
              label={t("reset.newPassword")}
              placeholder={t("common.min6")}
              showLabel={t("password.show")}
              hideLabel={t("password.hide")}
              showAria={t("password.showAria")}
              hideAria={t("password.hideAria")}
            />
            <Button className="w-full">{t("reset.submit")}</Button>
          </form>
        ) : (
          <p className="text-sm text-ink-soft">
            {t("reset.invalidBefore")}{" "}
            <Link className="font-medium text-sea hover:underline" href="/forgot-password">
              {t("reset.invalidLink")}
            </Link>
            .
          </p>
        )}
      </Card>
      <p className="mt-4 text-center text-sm text-ink-soft">
        <Link className="font-medium text-sea hover:underline" href="/login">
          {t("common.backToLogin")}
        </Link>
      </p>
    </main>
  );
}
