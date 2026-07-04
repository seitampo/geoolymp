import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Button, LinkButton } from "@/components/Button";
import { cardClasses } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ErrorBanner } from "@/components/ErrorBanner";
import { SelectField, TextArea, TextInput } from "@/components/FormFields";
import { Header } from "@/components/Header";
import { TaskCard, type TeacherGroupOption } from "@/components/TaskCard";
import { getCurrentUser } from "@/lib/auth";
import { parseEntityId } from "@/lib/params";
import { canOpenGroup } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDateTime, isAutoCheckedTask, isTaskVisibleToStudents } from "@/lib/tasks";
import { getTrainingTaskIds, isTrainingSupportedTaskType } from "@/lib/training";

export default async function TaskSetPage({
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

  const set = await prisma.taskSet.findUnique({
    where: { id: parsedSetId },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          task: {
            include: {
              submissions: {
                where: user.role === "STUDENT" ? { studentId: user.id } : undefined,
                include: { review: true, student: true },
              },
            },
          },
        },
      },
    },
  });

  if (!set || set.groupId !== groupId) {
    notFound();
  }

  const isTeacher = user.role === "TEACHER";

  // Черновики в подборке видит только учитель — тот же фильтр, что и на вкладке задач.
  // В обычной подборке ученик не видит и задачи, занятые в тренировках других подборок.
  const quarantinedTaskIds =
    !isTeacher && set.trainingMinutes === null ? await getTrainingTaskIds(groupId) : new Set<number>();
  const visibleItems = isTeacher
    ? set.items
    : set.items.filter(
        (item) => isTaskVisibleToStudents(item.task) && !quarantinedTaskIds.has(item.taskId),
      );

  // Открытие подборки тоже «показывает результат» — снимаем пометку «Новый результат»
  // с задач подборки (та же логика, что на вкладке задач: рендерим по уже загруженным данным).
  if (!isTeacher && visibleItems.length > 0) {
    const hasUnseen = visibleItems.some((item) => {
      const review = item.task.submissions[0]?.review;
      return review != null && review.seenByStudentAt === null;
    });

    if (hasUnseen) {
      await prisma.review.updateMany({
        where: {
          seenByStudentAt: null,
          submission: { studentId: user.id, taskId: { in: visibleItems.map((item) => item.taskId) } },
        },
        data: { seenByStudentAt: new Date() },
      });
    }
  }

  const membersCount = await prisma.membership.count({ where: { groupId } });

  const isTrainingMode = set.trainingMinutes !== null;
  const trainableCount = visibleItems.filter((item) =>
    isTrainingSupportedTaskType(item.task.type),
  ).length;

  // Ученику в тренировочной подборке — только карточка тренировки, без задач.
  const studentAttempt =
    !isTeacher && isTrainingMode
      ? await prisma.trainingAttempt.findUnique({
          where: { setId_studentId: { setId: set.id, studentId: user.id } },
        })
      : null;

  // Учителю — сводка попыток учеников.
  const attempts =
    isTeacher && isTrainingMode
      ? await prisma.trainingAttempt.findMany({
          where: { setId: set.id },
          include: { student: true, answers: true },
          orderBy: { startedAt: "desc" },
        })
      : [];
  const possibleScore = set.items
    .filter((item) => isAutoCheckedTask(item.task))
    .reduce((sum, item) => sum + item.task.maxScore, 0);

  const teacherGroups: TeacherGroupOption[] = isTeacher
    ? await prisma.group.findMany({
        where: { teacherId: user.id },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  // Задачи группы, которых ещё нет в подборке, — для формы добавления.
  const inSetTaskIds = new Set(set.items.map((item) => item.taskId));
  const availableTasks = isTeacher
    ? (
        await prisma.task.findMany({
          where: { groupId },
          select: { id: true, title: true },
          orderBy: { id: "asc" },
        })
      ).filter((task) => !inSetTaskIds.has(task.id))
    : [];

  return (
    <>
      <Header user={user} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <ErrorBanner message={error} />

        <div className="mb-6">
          <Link
            className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-900"
            href={`/groups/${groupId}?tab=sets`}
          >
            <span aria-hidden="true">←</span> К подборкам группы
          </Link>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">{set.title}</h1>
                <Badge tone="emerald">Задач: {visibleItems.length}</Badge>
                {isTrainingMode && <Badge tone="amber">Тренировка · {set.trainingMinutes} мин</Badge>}
              </div>
              <p className="mt-1 text-sm text-gray-600">{set.description}</p>
              {!isTeacher && !isTrainingMode && visibleItems.length > 0 && (
                <p className="mt-2 text-xs text-gray-500">Решайте задачи по порядку — сверху вниз.</p>
              )}
            </div>
            {isTeacher && (
              <form className="shrink-0" action={`/api/sets/${set.id}/delete`} method="post">
                <Button variant="danger" size="sm">
                  Удалить подборку
                </Button>
              </form>
            )}
          </div>
        </div>

        {isTeacher && (
          <div className="mb-6 space-y-4">
            <details className={cardClasses}>
              <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900">
                Редактировать название и описание
              </summary>
              <form className="mt-4 grid gap-3" action={`/api/sets/${set.id}/update`} method="post">
                <TextInput label="Название" name="title" defaultValue={set.title} />
                <TextArea label="Описание" name="description" defaultValue={set.description} />
                <TextInput
                  label="Лимит тренировки в минутах (пусто — обычная подборка)"
                  name="trainingMinutes"
                  type="number"
                  min={1}
                  max={600}
                  required={false}
                  defaultValue={set.trainingMinutes ?? ""}
                />
                <Button className="w-fit">Сохранить</Button>
              </form>
            </details>

            {availableTasks.length > 0 && (
              <form
                className={`${cardClasses} flex flex-col gap-2 sm:flex-row sm:items-end`}
                action={`/api/sets/${set.id}/tasks`}
                method="post"
              >
                <div className="flex-1">
                  <SelectField
                    label="Добавить задачу из группы"
                    name="taskId"
                    options={availableTasks.map((task) => ({
                      value: String(task.id),
                      label: task.title,
                    }))}
                  />
                </div>
                <Button className="shrink-0">Добавить в подборку</Button>
              </form>
            )}

            {isTrainingMode && attempts.length > 0 && (
              <div className={cardClasses}>
                <h2 className="text-base font-semibold text-gray-900">Попытки учеников</h2>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        <th className="py-2 pr-3">Ученик</th>
                        <th className="py-2 pr-3">Результат</th>
                        <th className="py-2 pr-3">Статус</th>
                        <th className="py-2">Начата</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {attempts.map((attempt) => {
                        const earned = attempt.answers.reduce((sum, answer) => sum + answer.score, 0);
                        return (
                          <tr key={attempt.id}>
                            <td className="py-2 pr-3 font-medium text-gray-900">{attempt.student.name}</td>
                            <td className="py-2 pr-3 text-gray-700">
                              {attempt.finishedAt ? `${earned} из ${possibleScore}` : "—"}
                            </td>
                            <td className="py-2 pr-3">
                              {attempt.finishedAt ? (
                                <Badge tone="green">Завершена</Badge>
                              ) : (
                                <Badge tone="amber">Идёт</Badge>
                              )}
                            </td>
                            <td className="py-2 text-gray-700">{formatDateTime(attempt.startedAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {!isTeacher && isTrainingMode ? (
          <section className={`${cardClasses} text-center`}>
            <h2 className="text-lg font-semibold text-gray-900">Тренировка</h2>
            <p className="mt-2 text-sm text-gray-600">
              {trainableCount} задач · {set.trainingMinutes} минут · одна попытка · без подсказок
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Задачи откроются после старта, таймер запустится сразу — подготовьтесь заранее.
            </p>
            <div className="mt-4 flex justify-center">
              {studentAttempt?.finishedAt ? (
                <LinkButton href={`/groups/${groupId}/sets/${set.id}/training`} variant="secondary">
                  Посмотреть результат
                </LinkButton>
              ) : studentAttempt ? (
                <LinkButton href={`/groups/${groupId}/sets/${set.id}/training`} variant="primary">
                  Продолжить тренировку
                </LinkButton>
              ) : trainableCount > 0 ? (
                <form action={`/api/sets/${set.id}/training/start`} method="post">
                  <Button variant="primary">Начать тренировку</Button>
                </form>
              ) : (
                <p className="text-sm text-gray-500">Учитель ещё не добавил задачи для тренировки.</p>
              )}
            </div>
          </section>
        ) : visibleItems.length === 0 ? (
          <EmptyState
            title="В подборке пока нет задач"
            description={
              isTeacher
                ? "Добавьте задачи группы через форму выше."
                : "Учитель ещё не добавил задачи в эту подборку."
            }
          />
        ) : (
          <div className="space-y-6">
            {visibleItems.map((item, index) => (
              <div key={item.id}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-500">
                    Задача {index + 1} из {visibleItems.length}
                  </p>
                  {isTeacher && (
                    <form action={`/api/sets/${set.id}/tasks/remove`} method="post">
                      <input type="hidden" name="taskId" value={item.taskId} />
                      <Button variant="danger" size="sm">
                        Убрать из подборки
                      </Button>
                    </form>
                  )}
                </div>
                <TaskCard
                  task={item.task}
                  isTeacher={isTeacher}
                  teacherGroups={teacherGroups}
                  membersCount={membersCount}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
