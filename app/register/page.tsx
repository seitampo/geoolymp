import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Compass } from "@/components/Compass";
import { ErrorBanner } from "@/components/ErrorBanner";
import { SelectField, TextInput } from "@/components/FormFields";
import { PasswordInput } from "@/components/PasswordInput";

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

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-12 sm:px-0 sm:py-16">
      <div className="mb-6 text-center">
        <Compass className="mx-auto mb-3 h-9 w-9 text-rust" />
        <h1 className="font-heading text-xl font-semibold tracking-tight text-ink">Регистрация</h1>
        <p className="mt-1 text-sm text-ink-mute">Аккаунт учителя или ученика</p>
      </div>
      <Card>
        <ErrorBanner message={error} />
        <form className="space-y-4" action="/api/auth/register" method="post">
          <TextInput label="Имя" name="name" placeholder="Как к вам обращаться" />
          <TextInput label="Email" name="email" type="email" placeholder="you@example.com" />
          <PasswordInput placeholder="Минимум 6 символов" />
          <div>
            <SelectField
              label="Роль"
              name="role"
              required
              options={[
                { value: "STUDENT", label: "Ученик" },
                { value: "TEACHER", label: "Учитель" },
              ]}
            />
            <p className="mt-1.5 text-xs text-ink-mute">
              Учитель создаёт группы и задачи; ученик вступает в группу по коду приглашения.
            </p>
          </div>
          <div>
            <TextInput
              label="Код учителя"
              name="inviteCode"
              required={false}
              placeholder="Только при регистрации учителем"
            />
            <p className="mt-1.5 text-xs text-ink-mute">
              Ученики оставляют поле пустым. Код учителя выдаёт администратор платформы.
            </p>
          </div>
          <Button className="w-full">Создать аккаунт</Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm text-ink-soft">
        Уже есть аккаунт?{" "}
        <Link className="font-medium text-sea hover:underline" href="/login">
          Войти
        </Link>
      </p>
    </main>
  );
}
