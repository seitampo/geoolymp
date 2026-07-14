import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Compass } from "@/components/Compass";
import { ErrorBanner } from "@/components/ErrorBanner";
import { SelectField, TextInput } from "@/components/FormFields";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PasswordInput } from "@/components/PasswordInput";
import { getLocale, getT } from "@/lib/i18n";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;
  const t = await getT();
  const locale = await getLocale();

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-12 sm:px-0 sm:py-16">
      <div className="mb-4 flex justify-end">
        <LanguageSwitcher locale={locale} aria={t("lang.aria")} />
      </div>
      <div className="mb-6 text-center">
        <Compass className="mx-auto mb-3 h-9 w-9 text-rust" />
        <h1 className="font-heading text-xl font-semibold tracking-tight text-ink">{t("register.title")}</h1>
        <p className="mt-1 text-sm text-ink-mute">{t("register.subtitle")}</p>
      </div>
      <Card>
        <ErrorBanner message={error} />
        <form className="space-y-4" action="/api/auth/register" method="post">
          <TextInput label={t("register.name")} name="name" placeholder={t("register.namePlaceholder")} />
          <TextInput label={t("common.email")} name="email" type="email" placeholder={t("common.emailPlaceholder")} />
          <PasswordInput
            label={t("common.password")}
            placeholder={t("common.min6")}
            showLabel={t("password.show")}
            hideLabel={t("password.hide")}
            showAria={t("password.showAria")}
            hideAria={t("password.hideAria")}
          />
          <div>
            <SelectField
              label={t("register.role")}
              name="role"
              required
              options={[
                { value: "STUDENT", label: t("common.student") },
                { value: "TEACHER", label: t("common.teacher") },
              ]}
            />
            <p className="mt-1.5 text-xs text-ink-mute">{t("register.roleHint")}</p>
          </div>
          <div>
            <TextInput
              label={t("register.inviteCode")}
              name="inviteCode"
              required={false}
              placeholder={t("register.invitePlaceholder")}
            />
            <p className="mt-1.5 text-xs text-ink-mute">{t("register.inviteHint")}</p>
          </div>
          <Button className="w-full">{t("register.submit")}</Button>
          <p className="text-center text-xs text-ink-mute">
            {t("register.consentPre")}{" "}
            <Link className="font-medium text-sea hover:underline" href="/privacy">
              {t("register.consentLink")}
            </Link>
            .
          </p>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm text-ink-soft">
        {t("register.haveAccount")}{" "}
        <Link className="font-medium text-sea hover:underline" href="/login">
          {t("common.login")}
        </Link>
      </p>
    </main>
  );
}
