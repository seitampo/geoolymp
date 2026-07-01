import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { ErrorBanner } from "@/components/ErrorBanner";
import { TextArea, TextInput } from "@/components/FormFields";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await searchParams;

  const groups =
    user.role === "TEACHER"
      ? await prisma.group.findMany({ where: { teacherId: user.id }, orderBy: { id: "desc" } })
      : await prisma.group.findMany({
          where: { memberships: { some: { userId: user.id } } },
          orderBy: { id: "desc" },
        });

  return (
    <>
      <Header user={user} />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold">Мои группы</h1>
        <ErrorBanner message={error} />

        {user.role === "TEACHER" ? (
          <section className="mb-8 border border-gray-200 p-4">
            <h2 className="mb-4 text-lg font-medium">Создать группу</h2>
            <form className="grid gap-4" action="/api/groups" method="post">
              <TextInput label="Название" name="name" />
              <TextArea label="Описание" name="description" />
              <button className="w-fit border border-gray-300 px-4 py-2" type="submit">
                Создать
              </button>
            </form>
          </section>
        ) : (
          <section className="mb-8 border border-gray-200 p-4">
            <h2 className="mb-4 text-lg font-medium">Вступить в группу</h2>
            <form className="flex max-w-md gap-2" action="/api/groups/join" method="post">
              <input
                className="flex-1 border border-gray-300 px-3 py-2"
                name="inviteCode"
                placeholder="Код приглашения"
                required
              />
              <button className="border border-gray-300 px-4 py-2" type="submit">
                Вступить
              </button>
            </form>
          </section>
        )}

        <div className="space-y-3">
          {groups.map((group) => (
            <Link
              className="block border border-gray-200 p-4 hover:bg-gray-50"
              href={`/groups/${group.id}`}
              key={group.id}
            >
              <h2 className="font-medium">{group.name}</h2>
              <p className="mt-1 text-gray-700">{group.description}</p>
              {user.role === "TEACHER" && (
                <p className="mt-2 text-gray-600">Код: {group.inviteCode}</p>
              )}
            </Link>
          ))}
          {groups.length === 0 && <p className="text-gray-700">Групп пока нет.</p>}
        </div>
      </main>
    </>
  );
}
