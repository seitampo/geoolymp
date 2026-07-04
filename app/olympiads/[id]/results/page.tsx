import { OlympiadAnswer, Task, User } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { cardClasses } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ErrorBanner } from "@/components/ErrorBanner";
import { TextInput } from "@/components/FormFields";
import { Header } from "@/components/Header";
import { getCurrentUser } from "@/lib/auth";
import {
  canStudentAccessOlympiad,
  finalizeExpiredOlympiadAttempts,
  getOlympiadPhase,
} from "@/lib/olympiads";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { isAutoCheckedTask, isMapTask } from "@/lib/tasks";

type AttemptForResults = {
  id: number;
  startedAt: Date;
  finishedAt: Date | null;
  student: User;
  answers: (OlympiadAnswer & { task: Task })[];
};

export default async function OlympiadResultsPage({
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

  if (olympiadId === null) {
    notFound();
  }

  const olympiad = await prisma.olympiad.findUnique({
    where: { id: olympiadId },
    include: { tasks: { include: { task: true } } },
  });

  if (!olympiad) {
    notFound();
  }

  const isTeacher = user.role === "TEACHER" && olympiad.teacherId === user.id;
  const phase = getOlympiadPhase(olympiad);

  if (!isTeacher) {
    if (!(await canStudentAccessOlympiad(olympiadId, user.id))) {
      notFound();
    }

    // Рейтинг ученикам — после закрытия, чтобы не раскрывать результаты по ходу.
    if (phase !== "closed") {
      redirect(`/olympiads/${olympiadId}`);
    }
  }

  // Ленивая финализация: у просроченных попыток автопроверка и время фиксируются здесь.
  await finalizeExpiredOlympiadAttempts(olympiadId);

  const attempts: AttemptForResults[] = await prisma.olympiadAttempt.findMany({
    where: { olympiadId },
    include: { student: true, answers: { include: { task: true } } },
  });

  const possibleScore = olympiad.tasks.reduce((sum, item) => sum + item.task.maxScore, 0);

  const scored = attempts.map((attempt) => ({
    attempt,
    score: attempt.answers.reduce((sum, answer) => sum + answer.score, 0),
    durationMs: attempt.finishedAt ? attempt.finishedAt.getTime() - attempt.startedAt.getTime() : null,
    ungradedCount: attempt.answers.filter(
      (answer) => !isAutoCheckedTask(answer.task) && answer.gradedAt === null,
    ).length,
  }));

  // Рейтинг: баллы по убыванию, при равенстве быстрее — выше. Незавершённые внизу.
  const finished = scored
    .filter((row) => row.attempt.finishedAt !== null)
    .sort((a, b) => b.score - a.score || (a.durationMs ?? 0) - (b.durationMs ?? 0));
  const running = scored.filter((row) => row.attempt.finishedAt === null);

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

        <h1 className="mb-1 text-2xl font-bold tracking-tight text-gray-900">
          Результаты: {olympiad.title}
        </h1>
        <p className="mb-6 text-sm text-gray-600">
          Максимум — {possibleScore} баллов. При равных баллах выше тот, кто справился быстрее.
        </p>

        {finished.length === 0 && running.length === 0 ? (
          <EmptyState title="Попыток пока нет" description="Здесь появится рейтинг участников." />
        ) : (
          <div className="space-y-5">
            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Место</th>
                      <th className="px-4 py-3">Участник</th>
                      <th className="px-4 py-3">Баллы</th>
                      <th className="px-4 py-3">Время</th>
                      <th className="px-4 py-3">Проверка</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {finished.map((row, index) => (
                      <tr
                        key={row.attempt.id}
                        className={row.attempt.student.id === user.id ? "bg-emerald-50/60" : undefined}
                      >
                        <td className="px-4 py-3 font-semibold text-gray-900">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{row.attempt.student.name}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {row.score} из {possibleScore}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{formatDuration(row.durationMs ?? 0)}</td>
                        <td className="px-4 py-3">
                          {row.ungradedCount > 0 ? (
                            <Badge tone="amber">Ожидает: {row.ungradedCount}</Badge>
                          ) : (
                            <Badge tone="green">Готово</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                    {running.map((row) => (
                      <tr key={row.attempt.id}>
                        <td className="px-4 py-3 text-gray-400">—</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{row.attempt.student.name}</td>
                        <td className="px-4 py-3 text-gray-400">—</td>
                        <td className="px-4 py-3 text-gray-400">—</td>
                        <td className="px-4 py-3">
                          <Badge tone="amber">Идёт</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {isTeacher &&
              finished.map((row) => (
                <details className={cardClasses} key={row.attempt.id}>
                  <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900">
                    Ответы: {row.attempt.student.name} · {row.score} из {possibleScore}
                    {row.ungradedCount > 0 ? ` · ожидает проверки: ${row.ungradedCount}` : ""}
                  </summary>
                  <div className="mt-3 space-y-3">
                    {olympiad.tasks.map((item, index) => {
                      const answer = row.attempt.answers.find((entry) => entry.taskId === item.taskId);
                      return (
                        <AnswerRow
                          key={item.id}
                          index={index}
                          task={item.task}
                          answer={answer}
                          canGrade
                        />
                      );
                    })}
                  </div>
                </details>
              ))}

            {!isTeacher && <OwnAnswers olympiadTasks={olympiad.tasks} scored={scored} userId={user.id} />}
          </div>
        )}
      </main>
    </>
  );
}

function OwnAnswers({
  olympiadTasks,
  scored,
  userId,
}: {
  olympiadTasks: { id: number; taskId: number; task: Task }[];
  scored: {
    attempt: AttemptForResults;
    score: number;
  }[];
  userId: number;
}) {
  const own = scored.find((row) => row.attempt.student.id === userId);

  if (!own || !own.attempt.finishedAt) {
    return null;
  }

  return (
    <section className={cardClasses}>
      <h2 className="text-base font-semibold text-gray-900">Ваши ответы</h2>
      <div className="mt-3 space-y-3">
        {olympiadTasks.map((item, index) => {
          const answer = own.attempt.answers.find((entry) => entry.taskId === item.taskId);
          return <AnswerRow key={item.id} index={index} task={item.task} answer={answer} canGrade={false} />;
        })}
      </div>
    </section>
  );
}

function AnswerRow({
  index,
  task,
  answer,
  canGrade,
}: {
  index: number;
  task: Task;
  answer?: OlympiadAnswer & { task?: Task };
  canGrade: boolean;
}) {
  const isAuto = isAutoCheckedTask(task);

  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium text-gray-900">
          {index + 1}. {task.title}
        </p>
        {isAuto ? (
          answer?.isCorrect ? (
            <Badge tone="green">Верно · {answer.score} из {task.maxScore}</Badge>
          ) : answer ? (
            <Badge tone="red">Неверно · 0 из {task.maxScore}</Badge>
          ) : (
            <Badge tone="red">Без ответа · 0 из {task.maxScore}</Badge>
          )
        ) : answer?.gradedAt ? (
          <Badge tone="green">
            Оценено · {answer.score} из {task.maxScore}
          </Badge>
        ) : answer ? (
          <Badge tone="amber">Ручная проверка</Badge>
        ) : (
          <Badge tone="red">Без ответа · 0 из {task.maxScore}</Badge>
        )}
      </div>
      <p className="mt-1.5 whitespace-pre-wrap text-gray-700">
        Ответ:{" "}
        <span className="font-medium text-gray-900">
          {answer ? (isMapTask(task.type) ? "точка на карте" : answer.answer) : "—"}
        </span>
      </p>
      {isAuto && task.correctAnswer && (
        <p className="mt-1 text-emerald-800">
          Правильный ответ: <span className="font-medium">{task.correctAnswer}</span>
        </p>
      )}
      {canGrade && answer && !isAuto && (
        <form
          className="mt-2 flex flex-wrap items-end gap-2"
          action={`/api/olympiad-answers/${answer.id}/grade`}
          method="post"
        >
          <div className="w-36">
            <TextInput
              label={`Балл из ${task.maxScore}`}
              name="score"
              type="number"
              min={0}
              max={task.maxScore}
              defaultValue={answer.gradedAt ? answer.score : undefined}
            />
          </div>
          <Button variant="secondary" size="sm">
            Оценить
          </Button>
        </form>
      )}
    </div>
  );
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
