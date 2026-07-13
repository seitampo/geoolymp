import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Compass } from "@/components/Compass";
import { ErrorBanner, SuccessBanner } from "@/components/ErrorBanner";
import { TextInput } from "@/components/FormFields";
import { PasswordInput } from "@/components/PasswordInput";

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

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-12 sm:px-0 sm:py-16">
      <div className="mb-6 text-center">
        <Compass className="mx-auto mb-3 h-9 w-9 text-rust" />
        <h1 className="font-heading text-xl font-semibold tracking-tight text-ink">Вход</h1>
        <p className="mt-1 text-sm text-ink-mute">С возвращением в Olympic Meridian</p>
      </div>
      <Card>
        <ErrorBanner message={error} />
        <SuccessBanner message={ok} />
        <form className="space-y-4" action="/api/auth/login" method="post">
          <TextInput label="Email" name="email" type="email" placeholder="you@example.com" />
          <PasswordInput />
          <div className="text-right">
            <Link className="text-sm font-medium text-sea hover:underline" href="/forgot-password">
              Забыли пароль?
            </Link>
          </div>
          <Button className="w-full">Войти</Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm text-ink-soft">
        Нет аккаунта?{" "}
        <Link className="font-medium text-sea hover:underline" href="/register">
          Зарегистрироваться
        </Link>
      </p>
    </main>
  );
}
