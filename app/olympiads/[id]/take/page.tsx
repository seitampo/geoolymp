import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { cardClasses } from "@/components/Card";
import { ErrorBanner } from "@/components/ErrorBanner";
import { TextArea } from "@/components/FormFields";
import { Header } from "@/components/Header";
import { MapAnswerInput } from "@/components/MapPoint";
import { TrainingTimer } from "@/components/TrainingTimer";
import { getCurrentUser } from "@/lib/auth";
import { finalizeOlympiadAttempt, parseTaskOrder } from "@/lib/olympiads";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { isMapTask, parseTaskOptions } from "@/lib/tasks";

export default async function OlympiadTakePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const { error } = await searchParams;
  const olympiadId = parseEntityId(id);

  if (olympiadId === null || user.role !== "STUDENT") {
    notFound();
  }

  let attempt = await prisma.olympiadAttempt.findUnique({
    where: { olympiadId_studentId: { olympiadId, studentId: user.id } },
    include: { answers: true, olympiad: { include: { tasks: { include: { task: true } } } } },
  });

  if (!attempt) {
    redirect(`/olympiads/${olympiadId}`);
  }

  // Дедлайн контролирует сервер: просроченная попытка закрывается при первой отдаче.
  if (!attempt.finishedAt && new Date() > attempt.expiresAt) {
    await finalizeOlympiadAttempt(attempt.id);
    attempt = await prisma.olympiadAttempt.findUnique({
      where: { id: attempt.id },
      include: { answers: true, olympiad: { include: { tasks: { include: { task: true } } } } },
    });
  }

  if (!attempt) {
    notFound();
  }

  if (attempt.finishedAt) {
    redirect(`/olympiads/${olympiadId}`);
  }

  const taskById = new Map(attempt.olympiad.tasks.map((item) => [item.taskId, item.task]));
  // Порядок участника (перемешанный при включённой опции) зафиксирован в попытке.
  const orderedTasks = parseTaskOrder(attempt.taskOrder)
    .map((taskId) => taskById.get(taskId))
    .filter((task) => task !== undefined);
  const answerByTaskId = new Map(attempt.answers.map((answer) => [answer.taskId, answer]));
  const answeredCount = orderedTasks.filter((task) => answerByTaskId.has(task.id)).length;

  return (
    <>
      <Header user={user} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <ErrorBanner message={error} />

        <Link
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-900"
          href={`/olympiads/${olympiadId}`}
        >
          <span aria-hidden="true">←</span> К олимпиаде
        </Link>

        <div className="space-y-5">
          <div className={`${cardClasses} sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3`}>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight text-gray-900">{attempt.olympiad.title}</h1>
              <p className="mt-0.5 text-xs text-gray-500">
                Отвечено: {answeredCount} из {orderedTasks.length} · Ответ можно менять до завершения
              </p>
            </div>
            <div className="flex items-center gap-3">
              <TrainingTimer expiresAt={attempt.expiresAt.toISOString()} />
              <form action={`/api/olympiad-attempts/${attempt.id}/finish`} method="post">
                <Button variant="secondary" size="sm">
                  Завершить
                </Button>
              </form>
            </div>
          </div>

          {orderedTasks.map((task, index) => {
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
                {task.imagePath && !isMapTask(task.type) && (
                  <img
                    className="mt-3 max-h-80 rounded-lg border border-gray-200 object-contain"
                    src={`/api/tasks/${task.id}/image`}
                    alt={task.title}
                    loading="lazy"
                  />
                )}

                <form
                  className="mt-4 grid gap-3"
                  action={`/api/olympiad-attempts/${attempt.id}/answers`}
                  method="post"
                >
                  <input type="hidden" name="taskId" value={task.id} />
                  {task.type === "TEXT" && (
                    <TextArea label="Ответ" name="answer" defaultValue={savedAnswer?.answer ?? ""} />
                  )}
                  {task.type === "MAP_POINT" && task.imagePath && (
                    <MapAnswerInput
                      imageUrl={`/api/tasks/${task.id}/image`}
                      initialAnswer={savedAnswer?.answer}
                    />
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

          <form className="text-center" action={`/api/olympiad-attempts/${attempt.id}/finish`} method="post">
            <Button variant="primary">Завершить олимпиаду</Button>
          </form>
        </div>
      </main>
    </>
  );
}
