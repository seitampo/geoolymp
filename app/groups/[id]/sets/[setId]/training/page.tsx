import { Task, TrainingAnswer } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Button, LinkButton } from "@/components/Button";
import { cardClasses } from "@/components/Card";
import { ErrorBanner } from "@/components/ErrorBanner";
import { TextArea } from "@/components/FormFields";
import { Header } from "@/components/Header";
import { trainingScore } from "@/lib/trainingScore";
import { TrainingSession } from "@/components/TrainingSession";
import { editorLabels, workspaceLabels } from "@/lib/uiLabels";
import { getCurrentUser } from "@/lib/auth";
import { getT, type TFunction } from "@/lib/i18n";
import { parseEntityId } from "@/lib/params";
import { canOpenGroup } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { MapAnswerInput } from "@/components/MapPoint";
import { mapAnswerLabels } from "@/lib/mapLabels";
import { isAutoCheckedTask, isMapTask, parseTaskOptions } from "@/lib/tasks";
import {
  finalizeTrainingAttempt,
  isTrainingSupportedTaskType,
} from "@/lib/training";

export default async function TrainingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; setId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const t = await getT();
  const { id, setId } = await params;
  const { error } = await searchParams;
  const groupId = parseEntityId(id);
  const parsedSetId = parseEntityId(setId);

  if (
    groupId === null ||
    parsedSetId === null ||
    !(await canOpenGroup(user.id, groupId))
  ) {
    notFound();
  }

  // Тренировка — режим ученика; учителю здесь нечего делать.
  if (user.role === "TEACHER") {
    redirect(`/groups/${groupId}/sets/${parsedSetId}`);
  }

  const set = await prisma.taskSet.findUnique({
    where: { id: parsedSetId },
    include: {
      items: { orderBy: { position: "asc" }, include: { task: true } },
    },
  });

  if (
    !set ||
    set.groupId !== groupId ||
    !set.trainingMinutes ||
    !set.isPublished
  ) {
    notFound();
  }

  let attempt = await prisma.trainingAttempt.findUnique({
    where: { setId_studentId: { setId: set.id, studentId: user.id } },
    include: { answers: true },
  });

  if (!attempt) {
    redirect(`/groups/${groupId}/sets/${set.id}`);
  }

  // Дедлайн проверяет сервер: просроченная попытка завершается при первой же отдаче.
  if (!attempt.finishedAt && new Date() > attempt.expiresAt) {
    await finalizeTrainingAttempt(attempt.id);
    attempt = await prisma.trainingAttempt.findUnique({
      where: { id: attempt.id },
      include: { answers: true },
    });
  }

  if (!attempt) {
    notFound();
  }

  const trainingTasks = set.items
    .filter((item) => isTrainingSupportedTaskType(item.task.type))
    .map((item) => item.task);
  const answerByTaskId = new Map(
    attempt.answers.map((answer) => [answer.taskId, answer]),
  );

  return (
    <>
      <Header user={user} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <ErrorBanner message={error} />

        <Link
          className="mb-4 inline-flex items-center gap-1 text-sm text-ink-mute transition-colors hover:text-ink"
          href={`/groups/${groupId}/sets/${set.id}`}
        >
          <span aria-hidden="true">←</span> {t("training.backToSet")}
        </Link>

        {attempt.finishedAt ? (
          <TrainingResult
            set={set}
            tasks={trainingTasks}
            attempt={attempt}
            groupId={groupId}
            t={t}
          />
        ) : (
          <ActiveTraining
            set={set}
            tasks={trainingTasks}
            attempt={attempt}
            answerByTaskId={answerByTaskId}
            t={t}
          />
        )}
      </main>
    </>
  );
}

function ActiveTraining({
  set,
  tasks,
  attempt,
  answerByTaskId,
  t,
}: {
  set: { id: number; title: string; trainingMinutes: number | null };
  tasks: Task[];
  attempt: { id: number; expiresAt: Date };
  answerByTaskId: Map<number, TrainingAnswer>;
  t: TFunction;
}) {
  return (
    <TrainingSession
      attemptId={attempt.id}
      expiresAt={attempt.expiresAt.toISOString()}
      title={set.title}
      tasks={tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        type: task.type,
        maxScore: task.maxScore,
        options: parseTaskOptions(task.options),
        imageUrl: task.imagePath
          ? "/api/tasks/" + task.id + "/image"
          : undefined,
      }))}
      initialAnswers={Object.fromEntries(
        [...answerByTaskId].map(([id, answer]) => [id, answer.answer]),
      )}
      labels={editorLabels(t)}
      mapLabels={mapAnswerLabels(t)}
      workspace={workspaceLabels(t)}
      finishLabel={t("training.finish")}
      confirmLabel={t("ui.finishConfirm")}
      cancelLabel={t("ui.cancel")}
      warning={t("ui.trainingHint")}
    />
  );
}

function TrainingResult({
  set,
  tasks,
  attempt,
  groupId,
  t,
}: {
  set: { id: number; title: string };
  tasks: Task[];
  attempt: {
    startedAt: Date;
    finishedAt: Date | null;
    answers: TrainingAnswer[];
  };
  groupId: number;
  t: TFunction;
}) {
  const answerByTaskId = new Map(
    attempt.answers.map((answer) => [answer.taskId, answer]),
  );

  // Автоподсчёт — только задачи с вариантами и правильным ответом (автопроверка части 2).
  const autoTasks = tasks.filter((task) => isAutoCheckedTask(task));
  const { possibleScore, earnedScore } = trainingScore(tasks, attempt.answers);
  const manualTasks = tasks.filter(
    (task) =>
      !autoTasks.includes(task) &&
      answerByTaskId.get(task.id)?.isCorrect === null,
  );

  const durationMs = attempt.finishedAt
    ? attempt.finishedAt.getTime() - attempt.startedAt.getTime()
    : 0;
  const durationMinutes = Math.floor(durationMs / 60000);
  const durationSeconds = Math.floor((durationMs % 60000) / 1000);

  return (
    <div className="space-y-5">
      <section className={`${cardClasses} text-center`}>
        <p className="text-sm font-medium text-green-700">
          {t("training.finished")}
        </p>
        <h1 className="mt-1 font-heading text-xl font-semibold tracking-tight text-ink">
          {set.title}
        </h1>
        <p className="mt-4 text-4xl font-bold text-ink">
          {earnedScore}
          <span className="text-xl font-medium text-ink-mute">
            {" "}
            {t("stats.of")} {possibleScore}
          </span>
        </p>
        <p className="mt-1 text-sm text-ink-mute">
          {t("training.autoScoreSuffix")} · {t("training.timeWord")}{" "}
          {durationMinutes}:{String(durationSeconds).padStart(2, "0")}
        </p>
        <div className="mt-5">
          <LinkButton href={`/groups/${groupId}?tab=sets`} variant="secondary">
            {t("setPage.backToSets")}
          </LinkButton>
        </div>
      </section>

      {tasks.map((task, index) => {
        const answer = answerByTaskId.get(task.id);
        const isAuto = isAutoCheckedTask(task);

        return (
          <article className={cardClasses} key={task.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="font-semibold text-ink">
                {index + 1}. {task.title}
              </h2>
              <div className="flex gap-1.5">
                {answer && (isAuto || answer.isCorrect !== null) ? (
                  <Badge
                    tone={
                      answer.score >= task.maxScore
                        ? "green"
                        : answer.score > 0
                          ? "amber"
                          : "red"
                    }
                  >
                    {t(
                      answer.score >= task.maxScore
                        ? "taskStatus.solved"
                        : answer.score > 0
                          ? "taskStatus.partial"
                          : "taskStatus.wrong",
                    )}{" "}
                    · {answer.score}/{task.maxScore}
                  </Badge>
                ) : (
                  <Badge>
                    {t(
                      answer
                        ? "training.noAutoCheck"
                        : "taskStatus.notSubmitted",
                    )}
                  </Badge>
                )}
              </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">
              {task.description}
            </p>
            {isMapTask(task.type) && task.imagePath ? (
              <div className="mt-3">
                <MapAnswerInput
                  imageUrl={`/api/tasks/${task.id}/image`}
                  initialAnswer={answer?.answer}
                  readOnly
                  target={
                    task.mapTargetX !== null &&
                    task.mapTargetY !== null &&
                    task.mapRadius !== null
                      ? {
                          x: task.mapTargetX,
                          y: task.mapTargetY,
                          radius: task.mapRadius,
                        }
                      : undefined
                  }
                  labels={mapAnswerLabels(t)}
                />
                <p className="mt-1.5 text-xs text-ink-mute">
                  {t("training.mapHint")}
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-1 rounded-lg bg-paper px-3 py-2 text-sm">
                <p className="text-ink-soft">
                  {t("training.yourAnswerPre")}{" "}
                  <span className="font-medium text-ink">
                    {answer?.answer || "—"}
                  </span>
                </p>
                {isAuto && (
                  <p className="text-green-800">
                    {t("training.correctAnswerPre")}{" "}
                    <span className="font-medium">{task.correctAnswer}</span>
                  </p>
                )}
              </div>
            )}
          </article>
        );
      })}

      {manualTasks.length > 0 && (
        <p className="text-center text-xs text-ink-mute">
          {t("training.manualNote")}
        </p>
      )}
    </div>
  );
}
