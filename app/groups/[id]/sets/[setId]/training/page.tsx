import { Task, TrainingAnswer } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Button, LinkButton } from "@/components/Button";
import { cardClasses } from "@/components/Card";
import { ErrorBanner } from "@/components/ErrorBanner";
import { TextArea } from "@/components/FormFields";
import { Header } from "@/components/Header";
import { TrainingTimer } from "@/components/TrainingTimer";
import { getCurrentUser } from "@/lib/auth";
import { parseEntityId } from "@/lib/params";
import { canOpenGroup } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { isAutoGradedTask, isTaskVisibleToStudents, parseTaskOptions } from "@/lib/tasks";
import { finalizeTrainingAttempt, isTrainingSupportedTaskType } from "@/lib/training";

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

  const { id, setId } = await params;
  const { error } = await searchParams;
  const groupId = parseEntityId(id);
  const parsedSetId = parseEntityId(setId);

  if (groupId === null || parsedSetId === null || !(await canOpenGroup(user.id, groupId))) {
    notFound();
  }

  // Тренировка — режим ученика; учителю здесь нечего делать.
  if (user.role === "TEACHER") {
    redirect(`/groups/${groupId}/sets/${parsedSetId}`);
  }

  const set = await prisma.taskSet.findUnique({
    where: { id: parsedSetId },
    include: { items: { orderBy: { position: "asc" }, include: { task: true } } },
  });

  if (!set || set.groupId !== groupId || !set.trainingMinutes) {
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
    .filter((item) => isTaskVisibleToStudents(item.task) && isTrainingSupportedTaskType(item.task.type))
    .map((item) => item.task);
  const answerByTaskId = new Map(attempt.answers.map((answer) => [answer.taskId, answer]));

  return (
    <>
      <Header user={user} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <ErrorBanner message={error} />

        <Link
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-900"
          href={`/groups/${groupId}/sets/${set.id}`}
        >
          <span aria-hidden="true">←</span> К подборке
        </Link>

        {attempt.finishedAt ? (
          <TrainingResult set={set} tasks={trainingTasks} attempt={attempt} groupId={groupId} />
        ) : (
          <ActiveTraining set={set} tasks={trainingTasks} attempt={attempt} answerByTaskId={answerByTaskId} />
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
}: {
  set: { id: number; title: string; trainingMinutes: number | null };
  tasks: Task[];
  attempt: { id: number; expiresAt: Date };
  answerByTaskId: Map<number, TrainingAnswer>;
}) {
  const answeredCount = tasks.filter((task) => answerByTaskId.has(task.id)).length;

  return (
    <div className="space-y-5">
      <div className={`${cardClasses} sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3`}>
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-gray-900">{set.title}</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Отвечено: {answeredCount} из {tasks.length} · Ответ можно менять до конца тренировки
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TrainingTimer expiresAt={attempt.expiresAt.toISOString()} />
          <form action={`/api/training/${attempt.id}/finish`} method="post">
            <Button variant="secondary" size="sm">
              Завершить
            </Button>
          </form>
        </div>
      </div>

      {tasks.map((task, index) => {
        const savedAnswer = answerByTaskId.get(task.id);
        const options = parseTaskOptions(task.options);

        return (
          <article className={cardClasses} key={task.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="font-semibold text-gray-900">
                {index + 1}. {task.title}
              </h2>
              <div className="flex gap-1.5">
                {savedAnswer && <Badge tone="green">Сохранено</Badge>}
                <Badge tone="emerald">Макс. балл: {task.maxScore}</Badge>
              </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{task.description}</p>
            {task.imagePath && (
              <img
                className="mt-3 max-h-80 rounded-lg border border-gray-200 object-contain"
                src={`/api/tasks/${task.id}/image`}
                alt={task.title}
                loading="lazy"
              />
            )}

            <form className="mt-4 grid gap-3" action={`/api/training/${attempt.id}/answers`} method="post">
              <input type="hidden" name="taskId" value={task.id} />
              {task.type === "TEXT" && (
                <TextArea label="Ответ" name="answer" defaultValue={savedAnswer?.answer ?? ""} />
              )}
              {task.type === "SINGLE_CHOICE" &&
                options.map((option) => (
                  <label
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 transition-colors hover:border-emerald-300"
                    key={option}
                  >
                    <input
                      className="h-4 w-4 accent-emerald-700"
                      name="answer"
                      type="radio"
                      value={option}
                      required
                      defaultChecked={savedAnswer?.answer === option}
                    />
                    {option}
                  </label>
                ))}
              {task.type === "MULTIPLE_CHOICE" &&
                options.map((option) => {
                  const selected = savedAnswer?.answer
                    ? savedAnswer.answer.split(";").map((value) => value.trim())
                    : [];
                  return (
                    <label
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 transition-colors hover:border-emerald-300"
                      key={option}
                    >
                      <input
                        className="h-4 w-4 accent-emerald-700"
                        name="answer"
                        type="checkbox"
                        value={option}
                        defaultChecked={selected.includes(option)}
                      />
                      {option}
                    </label>
                  );
                })}
              <Button className="w-fit" variant="secondary" size="sm">
                {savedAnswer ? "Обновить ответ" : "Сохранить ответ"}
              </Button>
            </form>
          </article>
        );
      })}

      <form className="text-center" action={`/api/training/${attempt.id}/finish`} method="post">
        <Button variant="primary">Завершить тренировку</Button>
      </form>
    </div>
  );
}

function TrainingResult({
  set,
  tasks,
  attempt,
  groupId,
}: {
  set: { id: number; title: string };
  tasks: Task[];
  attempt: { startedAt: Date; finishedAt: Date | null; answers: TrainingAnswer[] };
  groupId: number;
}) {
  const answerByTaskId = new Map(attempt.answers.map((answer) => [answer.taskId, answer]));

  // Автоподсчёт — только задачи с вариантами и правильным ответом (автопроверка части 2).
  const autoTasks = tasks.filter((task) => isAutoGradedTask(task.type) && task.correctAnswer);
  const possibleScore = autoTasks.reduce((sum, task) => sum + task.maxScore, 0);
  const earnedScore = autoTasks.reduce(
    (sum, task) => sum + (answerByTaskId.get(task.id)?.score ?? 0),
    0,
  );
  const manualTasks = tasks.filter((task) => !autoTasks.includes(task));

  const durationMs = attempt.finishedAt
    ? attempt.finishedAt.getTime() - attempt.startedAt.getTime()
    : 0;
  const durationMinutes = Math.floor(durationMs / 60000);
  const durationSeconds = Math.floor((durationMs % 60000) / 1000);

  return (
    <div className="space-y-5">
      <section className={`${cardClasses} text-center`}>
        <p className="text-sm font-medium text-emerald-700">Тренировка завершена</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{set.title}</h1>
        <p className="mt-4 text-4xl font-bold text-gray-900">
          {earnedScore}
          <span className="text-xl font-medium text-gray-500"> из {possibleScore}</span>
        </p>
        <p className="mt-1 text-sm text-gray-500">
          баллов по автопроверке · время: {durationMinutes}:{String(durationSeconds).padStart(2, "0")}
        </p>
        <div className="mt-5">
          <LinkButton href={`/groups/${groupId}?tab=sets`} variant="secondary">
            К подборкам группы
          </LinkButton>
        </div>
      </section>

      {tasks.map((task, index) => {
        const answer = answerByTaskId.get(task.id);
        const isAuto = isAutoGradedTask(task.type) && task.correctAnswer;

        return (
          <article className={cardClasses} key={task.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="font-semibold text-gray-900">
                {index + 1}. {task.title}
              </h2>
              <div className="flex gap-1.5">
                {isAuto ? (
                  answer?.isCorrect ? (
                    <Badge tone="green">Верно · {answer.score} из {task.maxScore}</Badge>
                  ) : answer ? (
                    <Badge tone="red">Неверно · 0 из {task.maxScore}</Badge>
                  ) : (
                    <Badge tone="red">Без ответа · 0 из {task.maxScore}</Badge>
                  )
                ) : (
                  <Badge>Без автопроверки</Badge>
                )}
              </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{task.description}</p>
            <div className="mt-3 space-y-1 rounded-lg bg-gray-50 px-3 py-2 text-sm">
              <p className="text-gray-700">
                Ваш ответ:{" "}
                <span className="font-medium text-gray-900">{answer?.answer || "—"}</span>
              </p>
              {isAuto && (
                <p className="text-emerald-800">
                  Правильный ответ: <span className="font-medium">{task.correctAnswer}</span>
                </p>
              )}
            </div>
          </article>
        );
      })}

      {manualTasks.length > 0 && (
        <p className="text-center text-xs text-gray-500">
          Задачи без вариантов ответа не оцениваются автоматически и не входят в сумму баллов.
        </p>
      )}
    </div>
  );
}
