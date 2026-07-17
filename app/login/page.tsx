import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Compass } from "@/components/Compass";
import { ErrorBanner, SuccessBanner } from "@/components/ErrorBanner";
import { TextInput } from "@/components/FormFields";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PasswordInput } from "@/components/PasswordInput";
import { getLocale, getT } from "@/lib/i18n";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const { error, ok } = await searchParams;
  const t = await getT();
  const locale = await getLocale();

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-12 sm:px-0 sm:py-16">
      <div className="mb-4 flex justify-end">
        <LanguageSwitcher locale={locale} aria={t("lang.aria")} />
      </div>
      <div className="mb-6 text-center">
        <Compass className="mx-auto mb-3 h-16 w-16" />
        <h1 className="font-heading text-xl font-semibold tracking-tight text-ink">{t("login.title")}</h1>
        <p className="mt-1 text-sm text-ink-mute">{t("login.subtitle")}</p>
      </div>
      <Card>
        <ErrorBanner message={error} />
        <SuccessBanner message={ok} />
        <form className="space-y-4" action="/api/auth/login" method="post">
          <TextInput label={t("common.email")} name="email" type="email" placeholder={t("common.emailPlaceholder")} />
          <PasswordInput
            label={t("common.password")}
            showLabel={t("password.show")}
            hideLabel={t("password.hide")}
            showAria={t("password.showAria")}
            hideAria={t("password.hideAria")}
          />
          <div className="text-right">
            <Link className="text-sm font-medium text-navy hover:underline" href="/forgot-password">
              {t("login.forgot")}
            </Link>
          </div>
          <Button className="w-full">{t("common.login")}</Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm text-ink-soft">
        {t("login.noAccount")}{" "}
        <Link className="font-medium text-navy hover:underline" href="/register">
          {t("common.register")}
        </Link>
      </p>
    </main>
  );
}
