import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { Button } from "@/components/Button";
import { TaskForm } from "@/components/TaskForm";
import { getT, type TranslationKey } from "@/lib/i18n";
import { getLessonText } from "@/lib/lessonText";
import type { LessonData, LessonMember } from "@/lib/lessonData";
import { prisma } from "@/lib/prisma";
import { taskFingerprint } from "@/lib/taskFingerprint";
import { isTrainingSupportedTaskType } from "@/lib/training";
import { ItemPicker } from "./ItemPicker";
import { LessonSettingsForm } from "./LessonSettingsForm";
import { LessonSteps } from "./LessonSteps";
import { LessonResults } from "./LessonResults";
import { MaterialForm } from "./MaterialForm";
import { QuestionList } from "./QuestionList";

export async function LessonEditor({
  lesson,
  members,
  teacherId,
  step,
  studentId,
}: {
  lesson: LessonData;
  members: LessonMember[];
  teacherId: number;
  step?: string;
  studentId?: number;
}) {
  const text = await getLessonText();
  const t = await getT();
  const base = `/groups/${lesson.groupId}/sets/${lesson.id}`;
  const active =
    step === "settings"
      ? "settings"
      : step === "results" && lesson.isPublished
        ? "results"
        : step === "content"
          ? "content"
          : lesson.isPublished
            ? "results"
            : "content";
  const locked = lesson.attempts.length > 0;
  const fingerprints = new Set(
    lesson.items.map((item) => taskFingerprint(item.task)),
  );
  const bank =
    active === "content" && !locked
      ? (
          await prisma.task.findMany({
            where: { group: { teacherId }, isLibraryItem: true },
            include: { group: { select: { name: true } } },
            orderBy: { id: "desc" },
          })
        ).filter((task) => {
          const key = taskFingerprint(task);
          if (
            fingerprints.has(key) ||
            (lesson.trainingMinutes !== null &&
              !isTrainingSupportedTaskType(task.type))
          )
            return false;
          fingerprints.add(key);
          return true;
        })
      : [];
  const materialBank =
    active === "content" && !locked
      ? await prisma.material.findMany({
          where: {
            groupId: lesson.groupId,
            id: { notIn: lesson.materials.map((item) => item.id) },
          },
          orderBy: { uploadedAt: "desc" },
        })
      : [];
  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs text-ink-mute">
            {lesson.group.name} ·{" "}
            {lesson.trainingMinutes === null
              ? text.practice
              : `${text.timed} · ${lesson.trainingMinutes} ${text.minutes}`}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold sm:text-2xl">
              {lesson.title}
            </h1>
            <span
              className={`rounded-md px-2 py-1 text-xs ${lesson.isPublished ? "bg-green-50 text-green-800" : "bg-ink/5 text-ink-soft"}`}
            >
              {lesson.isPublished ? text.issued : text.draft}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            {lesson.isPublished ? text.issuedHint : text.draftHint}
          </p>
        </div>
        <Link
          href={base + "/preview"}
          className="inline-flex min-h-11 items-center rounded-lg border border-line bg-white px-4 text-sm font-medium text-navy"
        >
          {text.preview}
        </Link>
      </div>
      <LessonSteps
        base={base}
        active={active}
        issued={lesson.isPublished}
        text={text}
      />
      {active === "settings" &&
        (locked ? (
          <p className="rounded-xl bg-amber-50 p-5 text-sm text-amber-900">
            {t("ui.lockedSet")}
          </p>
        ) : (
          <LessonSettingsForm groupId={lesson.groupId} lesson={lesson} />
        ))}
      {active === "results" && (
        <LessonResults
          lesson={lesson}
          members={members}
          studentId={studentId}
          text={text}
        />
      )}
      {active === "content" && (
        <div className="space-y-7">
          {locked && (
            <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              {t("ui.lockedSet")}
            </p>
          )}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {text.questions}{" "}
                  <span className="text-ink-mute">{lesson.items.length}</span>
                </h2>
                <p className="mt-1 text-xs text-ink-mute">
                  {text.maxScore}:{" "}
                  {lesson.items.reduce(
                    (sum, item) => sum + item.task.maxScore,
                    0,
                  )}
                </p>
              </div>
              {!locked && (
                <ItemPicker
                  title={text.addReady}
                  hint={text.bankHint}
                  items={bank.map((task) => ({
                    id: task.id,
                    title: task.title,
                    detail: `${t(`taskType.${task.type}` as TranslationKey)} · ${task.maxScore} · ${task.group.name}`,
                  }))}
                  action={`/api/sets/${lesson.id}/tasks`}
                  field="taskId"
                  mode="copy"
                  text={text}
                />
              )}
            </div>
            {lesson.items.length ? (
              <QuestionList
                key={lesson.items.map((item) => item.taskId).join(",")}
                setId={lesson.id}
                locked={locked}
                text={text}
                rows={lesson.items.map((item) => ({
                  id: item.taskId,
                  title: item.task.title,
                  detail: `${t(`taskType.${item.task.type}` as TranslationKey)} · ${text.score}: ${item.task.maxScore}`,
                  editor: locked ? (
                    <p className="my-3 whitespace-pre-wrap text-sm text-ink-soft">
                      {item.task.description}
                    </p>
                  ) : (
                    <>
                      <TaskForm
                        groupId={lesson.groupId}
                        task={item.task}
                        training={lesson.trainingMinutes !== null}
                        returnTo={base + "?step=content"}
                      />
                      <ActionForm
                        action={`/api/sets/${lesson.id}/tasks/remove`}
                        errorLabel={text.error}
                        savingLabel={text.saving}
                        successLabel={text.saved}
                      >
                        <input
                          type="hidden"
                          name="taskId"
                          value={item.taskId}
                        />
                        <Button variant="secondary" size="sm">
                          {text.remove}
                        </Button>
                      </ActionForm>
                    </>
                  ),
                }))}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-line bg-white px-5 py-8">
                <h3 className="font-medium">{text.emptyQuestions}</h3>
                <p className="mt-2 text-sm text-ink-soft">
                  {text.emptyQuestionsHint}
                </p>
              </div>
            )}
            {!locked && (
              <details
                id="task-new"
                className="scroll-mt-24 rounded-xl border border-line bg-white p-5"
              >
                <summary className="cursor-pointer font-semibold text-navy">
                  + {text.addQuestion}
                </summary>
                <p className="mt-3 text-xs text-ink-mute">
                  {text.questionHint}
                </p>
                <TaskForm
                  groupId={lesson.groupId}
                  setId={lesson.id}
                  training={lesson.trainingMinutes !== null}
                  returnTo={base + "?step=content"}
                />
              </details>
            )}
          </section>
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">
                {text.materials}{" "}
                <span className="text-ink-mute">{lesson.materials.length}</span>
              </h2>
              {!locked && materialBank.length > 0 && (
                <ItemPicker
                  title={text.materialAttach}
                  hint={text.materialHint}
                  items={materialBank.map((material) => ({
                    id: material.id,
                    title: material.title,
                    detail: material.type,
                  }))}
                  action={`/api/sets/${lesson.id}/materials`}
                  field="materialId"
                  text={text}
                />
              )}
            </div>
            {lesson.materials.length > 0 && (
              <ul className="divide-y divide-line rounded-xl border border-line bg-white">
                {lesson.materials.map((material) => (
                  <li
                    key={material.id}
                    className="flex items-center justify-between gap-4 px-5 py-3"
                  >
                    <span className="text-sm font-medium">
                      {material.title}
                    </span>
                    {!locked && (
                      <ActionForm
                        action={`/api/sets/${lesson.id}/materials`}
                        errorLabel={text.error}
                        savingLabel={text.saving}
                        successLabel={text.saved}
                      >
                        <input
                          type="hidden"
                          name="materialId"
                          value={material.id}
                        />
                        <input type="hidden" name="mode" value="remove" />
                        <Button variant="secondary" size="sm">
                          {text.remove}
                        </Button>
                      </ActionForm>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!locked && (
              <details className="rounded-xl border border-line bg-white p-5">
                <summary className="cursor-pointer font-semibold text-navy">
                  + {text.addMaterial}
                </summary>
                <p className="mt-3 text-xs text-ink-mute">
                  {text.materialHint}
                </p>
                <MaterialForm
                  groupId={lesson.groupId}
                  setId={lesson.id}
                  text={text}
                />
              </details>
            )}
          </section>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
            <Link
              className="text-sm text-ink-soft underline"
              href={base + "?step=settings"}
            >
              ← {text.settings}
            </Link>
            <Link
              href={base + "/preview"}
              className="inline-flex min-h-12 items-center rounded-lg bg-navy px-5 text-sm font-semibold text-white"
            >
              {text.previewAssign} →
            </Link>
          </div>
        </div>
      )}
      <details className="mt-10 text-sm text-ink-mute">
        <summary className="cursor-pointer">{text.deleteLesson}</summary>
        <form
          action={`/api/sets/${lesson.id}/delete`}
          method="post"
          data-confirm={t("setPage.deleteSetConfirm")}
          className="mt-3"
        >
          <Button variant="danger" size="sm">
            {text.deleteLesson}
          </Button>
        </form>
      </details>
    </>
  );
}
