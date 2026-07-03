import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Button, LinkButton } from "@/components/Button";
import { cardClasses } from "@/components/Card";
import { ErrorBanner } from "@/components/ErrorBanner";
import { TextArea, TextInput } from "@/components/FormFields";
import { Header } from "@/components/Header";
import { getCurrentUser } from "@/lib/auth";
import {
  canStudentAccessOlympiad,
  getOlympiadPhase,
  getOlympiadPhaseLabel,
  type OlympiadPhase,
} from "@/lib/olympiads";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { formatDateTime, toDateTimeLocalValue } from "@/lib/tasks";

export default async function OlympiadPage({
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
    include: {
      tasks: { orderBy: { position: "asc" }, include: { task: { include: { group: true } } } },
      groups: { include: { group: true } },
      _count: { select: { attempts: true } },
    },
  });

  if (!olympiad) {
    notFound();
  }

  const isTeacher = user.role === "TEACHER" && olympiad.teacherId === user.id;

  if (!isTeacher && !(await canStudentAccessOlympiad(olympiadId, user.id))) {
    notFound();
  }

  const phase = getOlympiadPhase(olympiad);
  const possibleScore = olympiad.tasks.reduce((sum, item) => sum + item.task.maxScore, 0);

  const attempt = !isTeacher
    ? await prisma.olympiadAttempt.findUnique({
        where: { olympiadId_studentId: { olympiadId, studentId: user.id } },
      })
    : null;

  return (
    <>
      <Header user={user} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <ErrorBanner message={error} />

        <Link
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-900"
          href="/dashboard"
        >
          <span aria-hidden="true">←</span> К группам
        </Link>

        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{olympiad.title}</h1>
            <PhaseBadge phase={phase} />
          </div>
          <p className="mt-1 text-sm text-gray-600">{olympiad.description}</p>
          <p className="mt-3 text-sm text-gray-700">
            {olympiad.tasks.length} задач · до {possibleScore} баллов · {olympiad.durationMinutes} минут на
            попытку{olympiad.shuffleTasks ? " · порядок задач перемешивается" : ""}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Открытие: {formatDateTime(olympiad.opensAt)} · Закрытие: {formatDateTime(olympiad.closesAt)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Группы: {olympiad.groups.map((assignment) => assignment.group.name).join(", ")}
          </p>
        </div>

        {isTeacher ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <LinkButton href={`/olympiads/${olympiad.id}/results`} variant="primary">
                Результаты и рейтинг ({olympiad._count.attempts})
              </LinkButton>
              <form action={`/api/olympiads/${olympiad.id}/delete`} method="post">
                <Button variant="danger">Удалить олимпиаду</Button>
              </form>
            </div>

            <details className={cardClasses}>
              <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900">
                Редактировать параметры
              </summary>
              <form className="mt-4 grid gap-3" action={`/api/olympiads/${olympiad.id}/update`} method="post">
                <TextInput label="Название" name="title" defaultValue={olympiad.title} />
                <TextArea label="Описание" name="description" defaultValue={olympiad.description} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <TextInput
                    label="Общее время (мин)"
                    name="durationMinutes"
                    type="number"
                    min={1}
                    max={600}
                    defaultValue={olympiad.durationMinutes}
                  />
                  <TextInput
                    label="Открытие"
                    name="opensAt"
                    type="datetime-local"
                    defaultValue={toDateTimeLocalValue(olympiad.opensAt)}
                  />
                  <TextInput
                    label="Закрытие"
                    name="closesAt"
                    type="datetime-local"
                    defaultValue={toDateTimeLocalValue(olympiad.closesAt)}
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700">
                  <input
                    className="h-4 w-4 accent-emerald-700"
                    type="checkbox"
                    name="shuffleTasks"
                    defaultChecked={olympiad.shuffleTasks}
                  />
                  Перемешивать порядок задач для каждого участника
                </label>
                <Button className="w-fit">Сохранить</Button>
              </form>
            </details>

            <section className={cardClasses}>
              <h2 className="text-base font-semibold text-gray-900">Задачи ({olympiad.tasks.length})</h2>
              <ol className="mt-3 space-y-2">
                {olympiad.tasks.map((item, index) => (
                  <li className="flex flex-wrap items-baseline gap-2 text-sm" key={item.id}>
                    <span className="text-gray-500">{index + 1}.</span>
                    <span className="font-medium text-gray-900">{item.task.title}</span>
                    <span className="text-xs text-gray-500">
                      {item.task.group.name} · до {item.task.maxScore} баллов
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        ) : (
          <section className={`${cardClasses} text-center`}>
            {phase === "upcoming" && (
              <p className="text-sm text-gray-600">
                Олимпиада откроется {formatDateTime(olympiad.opensAt)}. Задачи станут доступны после старта
                вашей попытки.
              </p>
            )}

            {phase === "running" &&
              (attempt?.finishedAt ? (
                <p className="text-sm text-gray-600">
                  Ваши ответы отправлены. Результаты и рейтинг появятся после закрытия олимпиады —{" "}
                  {formatDateTime(olympiad.closesAt)}.
                </p>
              ) : attempt ? (
                <div>
                  <p className="text-sm text-gray-600">Ваша попытка уже идёт — время тикает!</p>
                  <div className="mt-4 flex justify-center">
                    <LinkButton href={`/olympiads/${olympiad.id}/take`} variant="primary">
                      Продолжить олимпиаду
                    </LinkButton>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600">
                    После старта у вас будет {olympiad.durationMinutes} минут (но не позже закрытия
                    олимпиады). Попытка одна — подготовьтесь заранее.
                  </p>
                  <div className="mt-4 flex justify-center">
                    <form action={`/api/olympiads/${olympiad.id}/start`} method="post">
                      <Button variant="primary">Начать олимпиаду</Button>
                    </form>
                  </div>
                </div>
              ))}

            {phase === "closed" && (
              <div>
                <p className="text-sm text-gray-600">Олимпиада завершена.</p>
                <div className="mt-4 flex justify-center">
                  <LinkButton href={`/olympiads/${olympiad.id}/results`} variant="primary">
                    Результаты и рейтинг
                  </LinkButton>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </>
  );
}

function PhaseBadge({ phase }: { phase: OlympiadPhase }) {
  const tone = phase === "running" ? "green" : phase === "upcoming" ? "amber" : "gray";
  return <Badge tone={tone}>{getOlympiadPhaseLabel(phase)}</Badge>;
}
