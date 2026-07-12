import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Compass } from "@/components/Compass";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PasswordInput } from "@/components/PasswordInput";

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

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-12 sm:px-0 sm:py-16">
      <div className="mb-6 text-center">
        <Compass className="mx-auto mb-3 h-9 w-9 text-rust" />
        <h1 className="font-heading text-xl font-semibold tracking-tight text-ink">Новый пароль</h1>
        <p className="mt-1 text-sm text-ink-mute">Задайте новый пароль для входа</p>
      </div>
      <Card>
        <ErrorBanner message={error} />
        {token ? (
          <form className="space-y-4" action="/api/auth/reset-password" method="post">
            <input type="hidden" name="token" value={token} />
            <PasswordInput label="Новый пароль" placeholder="Минимум 6 символов" />
            <Button className="w-full">Сохранить пароль</Button>
          </form>
        ) : (
          <p className="text-sm text-ink-soft">
            Ссылка недействительна. Запросите новую на странице{" "}
            <Link className="font-medium text-sea hover:underline" href="/forgot-password">
              восстановления пароля
            </Link>
            .
          </p>
        )}
      </Card>
      <p className="mt-4 text-center text-sm text-ink-soft">
        <Link className="font-medium text-sea hover:underline" href="/login">
          Вернуться ко входу
        </Link>
      </p>
    </main>
  );
}
