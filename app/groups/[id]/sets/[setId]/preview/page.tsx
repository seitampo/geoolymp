import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { ActionForm } from "@/components/ActionForm";
import { Button } from "@/components/Button";
import { TaskWorkspace } from "@/components/TaskWorkspace";
import { LessonSteps } from "@/components/lessons/LessonSteps";
import { LessonMaterials } from "@/components/lessons/LessonMaterials";
import { PreviewQuestion } from "@/components/lessons/PreviewQuestion";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { getLessonText } from "@/lib/lessonText";
import { mapAnswerLabels } from "@/lib/mapLabels";
import { editorLabels, workspaceLabels } from "@/lib/uiLabels";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { parseTaskOptions } from "@/lib/tasks";
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string; setId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const values = await params;
  const groupId = parseEntityId(values.id),
    setId = parseEntityId(values.setId);
  if (groupId === null || setId === null || user.role !== "TEACHER") notFound();
  const lesson = await prisma.taskSet.findFirst({
    where: { id: setId, groupId, group: { teacherId: user.id } },
    include: {
      items: { orderBy: { position: "asc" }, include: { task: true } },
      materials: true,
    },
  });
  if (!lesson) notFound();
  const text = await getLessonText();
  const t = await getT();
  const base = `/groups/${groupId}/sets/${setId}`;
  const ready = lesson.items.length + lesson.materials.length > 0;
  return (
    <>
      <Header user={user} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-7 sm:px-6">
        <Link
          className="inline-flex min-h-10 items-center text-sm text-ink-soft"
          href={base + "?step=content"}
        >
          ← {text.backEditor}
        </Link>
        <LessonSteps
          base={base}
          active="preview"
          issued={lesson.isPublished}
          text={text}
        />
        <div className="rounded-xl border border-navy/20 bg-navy-soft p-5">
          <h1 className="font-semibold">{text.preview}</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {text.previewHint}
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-semibold">{lesson.title}</h2>
          {lesson.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">
              {lesson.description}
            </p>
          )}
          {lesson.trainingMinutes !== null && (
            <p className="mt-3 text-sm font-medium text-navy">
              {text.timed} · {lesson.trainingMinutes} {text.minutes}
            </p>
          )}
        </div>
        <LessonMaterials materials={lesson.materials} text={text} preview />
        {lesson.items.length > 0 && (
          <TaskWorkspace
            tasks={lesson.items.map((item) => ({
              id: item.taskId,
              title: item.task.title,
              status: "not-submitted",
            }))}
            labels={workspaceLabels(t)}
          >
            {lesson.items.map((item) => (
              <PreviewQuestion
                key={item.taskId}
                task={{
                  id: item.taskId,
                  title: item.task.title,
                  description: item.task.description,
                  maxScore: item.task.maxScore,
                  type: item.task.type,
                  options: parseTaskOptions(item.task.options),
                  imageUrl: item.task.imagePath
                    ? `/api/tasks/${item.taskId}/image`
                    : undefined,
                }}
                labels={editorLabels(t)}
                mapLabels={mapAnswerLabels(t)}
              />
            ))}
          </TaskWorkspace>
        )}
        <section className="rounded-xl border border-line bg-white p-5">
          <h2 className="font-semibold">
            {lesson.isPublished
              ? text.issued
              : ready
                ? text.lessonReady
                : text.emptyQuestions}
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            {lesson.isPublished
              ? text.issuedHint
              : ready
                ? text.issueHint
                : text.emptyQuestionsHint}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link
              href={base + "?step=content"}
              className="inline-flex min-h-11 items-center text-sm text-navy underline"
            >
              {text.backEditor}
            </Link>
            {!lesson.isPublished && (
              <ActionForm
                action={`/api/sets/${lesson.id}/assign`}
                errorLabel={text.error}
                savingLabel={text.saving}
                successLabel={text.saved}
              >
                <Button disabled={!ready}>{text.issue}</Button>
              </ActionForm>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
