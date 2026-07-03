import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { cardClasses } from "@/components/Card";
import { ErrorBanner } from "@/components/ErrorBanner";
import { TextArea, TextInput } from "@/components/FormFields";
import { Header } from "@/components/Header";
import { TaskClassificationBadges } from "@/components/TaskCard";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTaskTypeLabel } from "@/lib/tasks";
import { isTrainingSupportedTaskType } from "@/lib/training";

export default async function NewOlympiadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "TEACHER") {
    notFound();
  }

  const { error } = await searchParams;

  const groups = await prisma.group.findMany({
    where: { teacherId: user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Библиотека (часть 6): все задачи учителя; для олимпиады годятся текст и варианты.
  const libraryTasks = (
    await prisma.task.findMany({
      where: { group: { teacherId: user.id } },
      include: { group: { select: { name: true } } },
      orderBy: { id: "desc" },
    })
  ).filter((task) => isTrainingSupportedTaskType(task.type));

  return (
    <>
      <Header user={user} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-900"
          href="/dashboard"
        >
          <span aria-hidden="true">←</span> К группам
        </Link>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-gray-900">Конструктор олимпиады</h1>
        <p className="mb-6 text-sm text-gray-600">
          Выберите задачи из библиотеки, задайте время и окно проведения, назначьте группы.
        </p>
        <ErrorBanner message={error} />

        {groups.length === 0 || libraryTasks.length === 0 ? (
          <div className={`${cardClasses} text-center text-sm text-gray-600`}>
            Для олимпиады нужны хотя бы одна группа и одна задача с текстовым ответом или
            вариантами. Создайте их на странице группы.
          </div>
        ) : (
          <form className="space-y-5" action="/api/olympiads" method="post">
            <section className={`${cardClasses} grid gap-4`}>
              <h2 className="text-base font-semibold text-gray-900">Основное</h2>
              <TextInput label="Название" name="title" placeholder="Например: Осенняя олимпиада, 9 класс" />
              <TextArea label="Описание" name="description" placeholder="Формат, правила, что взять с собой" />
              <div className="grid gap-4 sm:grid-cols-3">
                <TextInput
                  label="Общее время (мин)"
                  name="durationMinutes"
                  type="number"
                  min={1}
                  max={600}
                  defaultValue={180}
                />
                <TextInput label="Открытие" name="opensAt" type="datetime-local" />
                <TextInput label="Закрытие" name="closesAt" type="datetime-local" />
              </div>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700">
                <input className="h-4 w-4 accent-emerald-700" type="checkbox" name="shuffleTasks" />
                Перемешивать порядок задач для каждого участника
              </label>
            </section>

            <section className={`${cardClasses}`}>
              <h2 className="text-base font-semibold text-gray-900">Группы-участницы</h2>
              <p className="mt-1 text-xs text-gray-500">Олимпиаду увидят ученики отмеченных групп.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {groups.map((group) => (
                  <label
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 transition-colors hover:border-emerald-300"
                    key={group.id}
                  >
                    <input className="h-4 w-4 accent-emerald-700" type="checkbox" name="groupIds" value={group.id} />
                    {group.name}
                  </label>
                ))}
              </div>
            </section>

            <section className={`${cardClasses}`}>
              <h2 className="text-base font-semibold text-gray-900">
                Задачи из библиотеки ({libraryTasks.length})
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Отмечайте в нужном порядке — он станет порядком задач (если не включено перемешивание).
                Задачи с загрузкой файлов в олимпиады не входят.
              </p>
              <ul className="mt-3 divide-y divide-gray-100">
                {libraryTasks.map((task) => (
                  <li key={task.id}>
                    <label className="flex cursor-pointer items-start gap-3 py-3">
                      <input
                        className="mt-1 h-4 w-4 shrink-0 accent-emerald-700"
                        type="checkbox"
                        name="taskIds"
                        value={task.id}
                      />
                      <span className="min-w-0">
                        <span className="block font-medium text-gray-900">{task.title}</span>
                        <span className="mt-0.5 block text-xs text-gray-500">
                          {task.group.name} · {getTaskTypeLabel(task.type)} · до {task.maxScore} баллов
                        </span>
                        <span className="mt-1.5 flex flex-wrap gap-1.5">
                          <TaskClassificationBadges task={task} />
                          {!task.isPublished && <Badge tone="amber">Черновик</Badge>}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>

            <Button variant="primary">Создать олимпиаду</Button>
          </form>
        )}
      </main>
    </>
  );
}
