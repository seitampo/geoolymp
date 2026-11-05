import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { ErrorBanner } from "@/components/ErrorBanner";
import { TaskForm } from "@/components/TaskForm";
import { QuestionBank } from "@/components/lessons/QuestionBank";
import { getCurrentUser } from "@/lib/auth";
import { getT, type TranslationKey } from "@/lib/i18n";
import { getLessonText } from "@/lib/lessonText";
import { prisma } from "@/lib/prisma";
import { parseEntityId } from "@/lib/params";
export default async function BankPage({
  searchParams,
}: {
  searchParams: Promise<{ groupId?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "TEACHER") redirect("/dashboard");
  const query = await searchParams;
  const tasks = await prisma.task.findMany({
    where: { group: { teacherId: user.id }, isLibraryItem: true },
    include: {
      group: { select: { name: true } },
      _count: { select: { trainingAnswers: true } },
    },
    orderBy: { id: "desc" },
  });
  const text = await getLessonText();
  const t = await getT();
  const id = query.groupId ? parseEntityId(query.groupId) : null;
  const group = id
    ? await prisma.group.findFirst({ where: { id, teacherId: user.id } })
    : null;
  return (
    <>
      <Header user={user} />
      <main className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-6">
        <Link
          href={group ? `/groups/${group.id}` : "/dashboard"}
          className="inline-flex min-h-10 items-center text-sm text-ink-soft"
        >
          ← {group ? text.backLessons : text.groups}
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">{text.myQuestions}</h1>
          <p className="mt-2 text-sm text-ink-soft">{text.bankHint}</p>
        </div>
        <ErrorBanner message={query.error} />
        <QuestionBank
          text={text}
          items={tasks.map((task) => ({
            id: task.id,
            title: task.title,
            detail: `${task.group.name} · ${t(`taskType.${task.type}` as TranslationKey)} · ${text.score}: ${task.maxScore}`,
            editor: <TaskForm groupId={task.groupId} task={task} />,
          }))}
        />
      </main>
    </>
  );
}
