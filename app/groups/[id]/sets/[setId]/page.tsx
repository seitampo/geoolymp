import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { ErrorBanner, SuccessBanner } from "@/components/ErrorBanner";
import { TaskCard } from "@/components/TaskCard";
import { TaskWorkspace } from "@/components/TaskWorkspace";
import { ActionForm } from "@/components/ActionForm";
import { Button } from "@/components/Button";
import { LessonEditor } from "@/components/lessons/LessonEditor";
import { LessonMaterials } from "@/components/lessons/LessonMaterials";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { getLessonText } from "@/lib/lessonText";
import { lessonInclude } from "@/lib/lessonData";
import { parseEntityId } from "@/lib/params";
import { canOpenGroup } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { publishedTaskWhere } from "@/lib/lessonAccess";
import { notInTrainingSetFilter } from "@/lib/training";
import { studentTaskStatus } from "@/lib/taskStatus";
import { workspaceLabels } from "@/lib/uiLabels";
export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; setId: string }>;
  searchParams: Promise<{
    step?: string;
    student?: string;
    error?: string;
    ok?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id, setId } = await params;
  const query = await searchParams;
  const groupId = parseEntityId(id),
    lessonId = parseEntityId(setId);
  if (
    groupId === null ||
    lessonId === null ||
    !(await canOpenGroup(user.id, groupId))
  )
    notFound();
  const teacher = user.role === "TEACHER";
  const lesson = await prisma.taskSet.findUnique({
    where: { id: lessonId },
    include: lessonInclude,
  });
  if (
    !lesson ||
    lesson.groupId !== groupId ||
    (!teacher && !lesson.isPublished) ||
    (teacher && lesson.group.teacherId !== user.id)
  )
    notFound();
  const text = await getLessonText();
  const t = await getT();
  const base = `/groups/${groupId}/sets/${lesson.id}`;
  const members = teacher
    ? await prisma.membership.findMany({
        where: { groupId },
        select: { userId: true, user: { select: { id: true, name: true } } },
        orderBy: { user: { name: "asc" } },
      })
    : [];
  const visibleIds = teacher
    ? new Set<number>()
    : new Set(
        (
          await prisma.task.findMany({
            where: {
              id: { in: lesson.items.map((item) => item.taskId) },
              AND: [publishedTaskWhere(), notInTrainingSetFilter],
            },
            select: { id: true },
          })
        ).map((task) => task.id),
      );
  const items = lesson.items
    .filter((item) => visibleIds.has(item.taskId))
    .map((item) => ({
      ...item,
      task: {
        ...item.task,
        submissions: item.task.submissions.filter(
          (sub) => sub.studentId === user.id,
        ),
      },
    }));
  const attempt = lesson.attempts.find((row) => row.studentId === user.id);
  return (
    <>
      <Header user={user} />
      <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-9">
        <Link
          href={`/groups/${groupId}?tab=sets`}
          className="mb-6 inline-flex min-h-10 items-center text-sm text-ink-soft hover:text-navy"
        >
          ← {text.backLessons}
        </Link>
        <ErrorBanner message={query.error} />
        <SuccessBanner message={query.ok} />
        {teacher ? (
          <LessonEditor
            lesson={lesson}
            members={members}
            teacherId={user.id}
            step={query.step}
            studentId={
              query.student
                ? (parseEntityId(query.student) ?? undefined)
                : undefined
            }
          />
        ) : (
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-xs text-ink-mute">
                {lesson.group.name} ·{" "}
                {lesson.trainingMinutes === null ? text.practice : text.timed}
              </p>
              <h1 className="text-xl font-semibold sm:text-2xl">
                {lesson.title}
              </h1>
              {lesson.description && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">
                  {lesson.description}
                </p>
              )}
            </div>
            <LessonMaterials
              materials={lesson.materials.filter(
                (material) => material.isPublished,
              )}
              text={text}
              studentId={user.id}
            />
            {lesson.trainingMinutes !== null ? (
              <section className="rounded-xl border border-line bg-white p-6">
                <h2 className="text-lg font-semibold">
                  {text.timed} · {lesson.trainingMinutes} {text.minutes}
                </h2>
                <p className="my-3 text-sm text-ink-soft">{text.timedHint}</p>
                <p className="mb-5 text-sm text-ink-mute">
                  {lesson.items.length} {text.questionsCount} · {text.maxScore}:{" "}
                  {lesson.items.reduce(
                    (sum, item) => sum + item.task.maxScore,
                    0,
                  )}
                </p>
                {attempt ? (
                  <Link
                    href={base + "/training"}
                    className="inline-flex min-h-12 items-center rounded-lg bg-navy px-5 text-sm font-semibold text-white"
                  >
                    {attempt.finishedAt ? text.viewResults : text.resume} →
                  </Link>
                ) : (
                  <ActionForm
                    action={`/api/sets/${lesson.id}/training/start`}
                    errorLabel={text.error}
                    savingLabel={text.saving}
                    successLabel={text.saved}
                  >
                    <Button className="w-fit">{text.start} →</Button>
                  </ActionForm>
                )}
              </section>
            ) : items.length > 0 ? (
              <TaskWorkspace
                tasks={items.map((item) => ({
                  id: item.taskId,
                  title: item.task.title,
                  status: studentTaskStatus(
                    item.task.submissions[0],
                    item.task.maxScore,
                  ),
                  unseen:
                    item.task.submissions[0]?.review?.seenByStudentAt === null,
                }))}
                labels={workspaceLabels(t)}
              >
                {items.map((item) => (
                  <TaskCard
                    key={item.taskId}
                    task={item.task}
                    isTeacher={false}
                    teacherGroups={[]}
                    membersCount={0}
                    submissionContext={{
                      returnTo: base,
                      oneShot: false,
                      studentId: user.id,
                    }}
                  />
                ))}
              </TaskWorkspace>
            ) : null}
          </div>
        )}
      </main>
    </>
  );
}
