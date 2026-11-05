import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { ErrorBanner } from "@/components/ErrorBanner";
import { LessonSettingsForm } from "@/components/lessons/LessonSettingsForm";
import { getCurrentUser } from "@/lib/auth";
import { getLessonText } from "@/lib/lessonText";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
export default async function NewLesson({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const groupId = parseEntityId((await params).id);
  const group =
    groupId === null
      ? null
      : await prisma.group.findFirst({
          where: { id: groupId, teacherId: user.id },
        });
  if (!group || user.role !== "TEACHER") notFound();
  const text = await getLessonText();
  return (
    <>
      <Header user={user} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href={`/groups/${group.id}`}
          className="mb-6 inline-flex min-h-10 items-center text-sm text-ink-soft"
        >
          ← {text.backLessons}
        </Link>
        <p className="mb-2 text-xs text-ink-mute">{group.name}</p>
        <h1 className="text-2xl font-semibold">{text.newLesson}</h1>
        <p className="mb-6 mt-3 text-sm text-ink-soft">
          1. {text.settings} → 2. {text.content} → 3. {text.previewAssign}
        </p>
        <ErrorBanner message={(await searchParams).error} />
        <LessonSettingsForm groupId={group.id} />
      </main>
    </>
  );
}
