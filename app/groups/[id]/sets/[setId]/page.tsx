import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
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
import { isTaskVisibleToStudents } from "@/lib/tasks";

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
  const visibleItems = isTeacher
    ? set.items
    : set.items.filter((item) => isTaskVisibleToStudents(item.task));

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
              </div>
              <p className="mt-1 text-sm text-gray-600">{set.description}</p>
              {!isTeacher && visibleItems.length > 0 && (
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
          </div>
        )}

        {visibleItems.length === 0 ? (
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
