import { Material, Membership, Review, Role, Submission, Task, User } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge, SubmissionStatusBadge, TaskStatusBadge } from "@/components/Badge";
import { AnchorButton, Button } from "@/components/Button";
import { cardClasses } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ErrorBanner } from "@/components/ErrorBanner";
import { FileInput, SelectField, TextArea, TextInput } from "@/components/FormFields";
import { Header } from "@/components/Header";
import { getCurrentUser } from "@/lib/auth";
import {
  getMaterialTypeBadgeLabel,
  isPreviewableMaterial,
  materialTypes,
} from "@/lib/materials";
import { parseEntityId } from "@/lib/params";
import { canOpenGroup } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getTaskTypeLabel, isAutoGradedTask, parseTaskOptions, taskTypes } from "@/lib/tasks";
import { maxUploadLabel } from "@/lib/uploads";

type Tab = "materials" | "tasks" | "submissions" | "members";

type TaskWithStudentSubmission = Task & {
  submissions: (Submission & {
    review: Review | null;
    student: User;
  })[];
};

type GroupForPage = {
  id: number;
  name: string;
  description: string;
  inviteCode: string;
  materials: Material[];
  tasks: TaskWithStudentSubmission[];
  memberships: (Membership & {
    user: User & {
      submissions: (Submission & { review: Review | null })[];
    };
  })[];
};

type SubmissionForTeacher = Submission & {
  student: User;
  task: Task;
  review: Review | null;
};

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; error?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const { tab, error } = await searchParams;
  const groupId = parseEntityId(id);

  if (groupId === null || !(await canOpenGroup(user.id, groupId))) {
    notFound();
  }

  const activeTab = getActiveTab(tab, user.role);
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      materials: { orderBy: { uploadedAt: "desc" } },
      tasks: {
        orderBy: { id: "asc" },
        include: {
          submissions: {
            where: user.role === "STUDENT" ? { studentId: user.id } : undefined,
            include: { review: true, student: true },
          },
        },
      },
      memberships: {
        include: {
          user: {
            include: {
              submissions: {
                where: { task: { groupId }, status: "REVIEWED" },
                include: { review: true },
              },
            },
          },
        },
      },
    },
  });

  if (!group) {
    notFound();
  }

  // Полный список решений нужен только на вкладке «Решения» у учителя — не грузим его зря.
  const allSubmissions =
    user.role === "TEACHER" && activeTab === "submissions"
      ? await prisma.submission.findMany({
          where: { task: { groupId } },
          include: { student: true, task: true, review: true },
          orderBy: { id: "desc" },
        })
      : [];

  const isTeacher = user.role === "TEACHER";

  return (
    <>
      <Header user={user} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <ErrorBanner message={error} />

        <div className="mb-6">
          <Link
            className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-900"
            href="/dashboard"
          >
            <span aria-hidden="true">←</span> Назад к группам
          </Link>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">{group.name}</h1>
              <p className="mt-1 text-sm text-gray-600">{group.description}</p>
              {isTeacher && (
                <div className="mt-3">
                  <Badge tone="emerald">
                    Код приглашения: <span className="font-mono">{group.inviteCode}</span>
                  </Badge>
                </div>
              )}
            </div>
            {isTeacher && (
              <form className="shrink-0" action={`/api/groups/${group.id}/delete`} method="post">
                <Button variant="danger" size="sm">
                  Удалить группу
                </Button>
              </form>
            )}
          </div>
        </div>

        <nav className="mb-6 flex gap-2 overflow-x-auto pb-1" aria-label="Разделы группы">
          <TabLink groupId={group.id} tab="materials" activeTab={activeTab} label="Материалы" />
          <TabLink groupId={group.id} tab="tasks" activeTab={activeTab} label="Задачи" />
          {isTeacher && (
            <TabLink groupId={group.id} tab="submissions" activeTab={activeTab} label="Решения" />
          )}
          <TabLink groupId={group.id} tab="members" activeTab={activeTab} label="Участники" />
        </nav>

        {activeTab === "materials" && <MaterialsTab group={group} isTeacher={isTeacher} />}
        {activeTab === "tasks" && <TasksTab group={group} isTeacher={isTeacher} />}
        {activeTab === "submissions" && isTeacher && <SubmissionsTab submissions={allSubmissions} />}
        {activeTab === "members" && <MembersTab memberships={group.memberships} isTeacher={isTeacher} />}
      </main>
    </>
  );
}

function getActiveTab(tab: string | undefined, role: Role): Tab {
  if (tab === "tasks" || tab === "members" || tab === "materials") {
    return tab;
  }

  if (role === "TEACHER" && tab === "submissions") {
    return "submissions";
  }

  return "materials";
}

function TabLink({
  groupId,
  tab,
  activeTab,
  label,
}: {
  groupId: number;
  tab: Tab;
  activeTab: Tab;
  label: string;
}) {
  const isActive = tab === activeTab;

  return (
    <Link
      className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-emerald-700 text-white"
          : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900"
      }`}
      href={`/groups/${groupId}?tab=${tab}`}
      aria-current={isActive ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

function MaterialsTab({ group, isTeacher }: { group: GroupForPage; isTeacher: boolean }) {
  return (
    <section className="space-y-5">
      {isTeacher && (
        <form
          className={`${cardClasses} grid gap-4`}
          action={`/api/groups/${group.id}/materials`}
          method="post"
          encType="multipart/form-data"
        >
          <h2 className="text-base font-semibold text-gray-900">Добавить материал</h2>
          <TextInput label="Название" name="title" />
          <TextArea label="Описание" name="description" />
          <MaterialTypeSelect />
          <TextInput
            label="Ссылка на внешний ресурс (необязательно)"
            name="url"
            type="url"
            required={false}
            placeholder="Только для типа «Ссылка»"
          />
          <FileInput
            label="Файл (необязательно)"
            name="file"
            hint={`Только для файловых типов, до ${maxUploadLabel()}`}
          />
          <Button className="w-fit">Добавить</Button>
        </form>
      )}

      {group.materials.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {group.materials.map((material) => (
            <MaterialCard key={material.id} material={material} isTeacher={isTeacher} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Материалов пока нет"
          description={
            isTeacher
              ? "Добавьте первый материал: файл или ссылку на внешний ресурс."
              : "Учитель ещё не добавил материалы в эту группу."
          }
        />
      )}
    </section>
  );
}

function MaterialCard({ material, isTeacher }: { material: Material; isTeacher: boolean }) {
  const openHref = material.url ?? `/api/materials/${material.id}/file`;
  const downloadHref = material.url ?? `/api/materials/${material.id}/download`;
  // У текстового материала нет ни файла, ни ссылки — кнопки «Открыть/Скачать» не нужны.
  const hasContent = Boolean(material.url ?? material.filePath);

  return (
    <article className={cardClasses}>
      {isPreviewableMaterial(material.type) && material.filePath && (
        <div className="mb-4 h-44 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          {material.type === "IMAGE" ? (
            <img
              className="h-full w-full object-cover"
              src={`/api/materials/${material.id}/file`}
              alt={material.title}
              loading="lazy"
            />
          ) : (
            <iframe className="h-full w-full" src={`/api/materials/${material.id}/file`} title={material.title} />
          )}
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900">{material.title}</h3>
        <Badge>{getMaterialTypeBadgeLabel(material.type)}</Badge>
      </div>
      <p className="mt-1 text-sm text-gray-600">{material.description}</p>
      <div className="mt-3 space-y-0.5 text-xs text-gray-500">
        <p>Дата загрузки: {formatDate(material.uploadedAt)}</p>
        {material.originalFileName && <p className="break-all">Файл: {material.originalFileName}</p>}
      </div>
      {hasContent && (
        <div className="mt-4 flex flex-wrap gap-2">
          <AnchorButton href={openHref} variant="primary" size="sm" newTab>
            Открыть
          </AnchorButton>
          <AnchorButton href={downloadHref} variant="secondary" size="sm">
            Скачать
          </AnchorButton>
        </div>
      )}
      {isTeacher && (
        <details className="mt-4 border-t border-gray-100 pt-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900">
            Редактировать
          </summary>
          <form
            className="mt-4 grid gap-3"
            action={`/api/materials/${material.id}/update`}
            method="post"
            encType="multipart/form-data"
          >
            <TextInput label="Название" name="title" defaultValue={material.title} />
            <TextArea label="Описание" name="description" defaultValue={material.description} />
            <MaterialTypeSelect defaultValue={material.type} />
            <TextInput
              label="Ссылка на внешний ресурс (необязательно)"
              name="url"
              type="url"
              required={false}
              defaultValue={material.url ?? ""}
              placeholder="Только для типа «Ссылка»"
            />
            <FileInput label="Новый файл (необязательно)" name="file" />
            <Button className="w-fit">Сохранить</Button>
          </form>
          <form className="mt-3" action={`/api/materials/${material.id}/delete`} method="post">
            <Button variant="danger" size="sm">
              Удалить
            </Button>
          </form>
        </details>
      )}
    </article>
  );
}

function MaterialTypeSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <SelectField
      label="Тип материала"
      name="type"
      defaultValue={defaultValue ?? "TEXT"}
      options={materialTypes}
    />
  );
}

function TasksTab({ group, isTeacher }: { group: GroupForPage; isTeacher: boolean }) {
  return (
    <section className="space-y-5">
      {isTeacher && (
        <form
          className={`${cardClasses} grid gap-4`}
          action={`/api/groups/${group.id}/tasks`}
          method="post"
          encType="multipart/form-data"
        >
          <h2 className="text-base font-semibold text-gray-900">Создать задачу</h2>
          <TextInput label="Название" name="title" />
          <TextArea label="Условие" name="description" />
          <TaskTypeSelect />
          <TextArea
            label="Варианты ответов"
            name="options"
            required={false}
            placeholder="Каждый вариант с новой строки"
          />
          <TextInput
            label="Правильный ответ"
            name="correctAnswer"
            required={false}
            placeholder="Для вариантов — точный текст; несколько ответов через «;»"
          />
          <TextInput label="Максимальный балл" name="maxScore" type="number" min={1} />
          <FileInput
            label="Изображение к условию"
            name="image"
            accept="image/*"
            hint={`JPG, PNG или WebP, до ${maxUploadLabel()}`}
          />
          <Button className="w-fit">Создать</Button>
        </form>
      )}

      {group.tasks.length > 0 ? (
        <div className="space-y-4">
          {group.tasks.map((task) => (
            <TaskCard key={task.id} task={task} isTeacher={isTeacher} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Задач пока нет"
          description={
            isTeacher
              ? "Создайте первую задачу — ученики увидят её на этой вкладке."
              : "Учитель ещё не добавил задачи в эту группу."
          }
        />
      )}
    </section>
  );
}

function TaskTypeSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <SelectField label="Тип задачи" name="type" defaultValue={defaultValue ?? "TEXT"} options={taskTypes} />
  );
}

function TaskCard({ task, isTeacher }: { task: TaskWithStudentSubmission; isTeacher: boolean }) {
  const submission = task.submissions[0];
  const options = parseTaskOptions(task.options);

  return (
    <article className={cardClasses}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900">{task.title}</h3>
        <div className="flex flex-wrap gap-1.5">
          {!isTeacher && <TaskStatusBadge status={submission?.status ?? null} />}
          <Badge>{getTaskTypeLabel(task.type)}</Badge>
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
      {isTeacher && task.correctAnswer && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Правильный ответ: {task.correctAnswer}
        </p>
      )}

      {isTeacher && (
        <details className="mt-4 border-t border-gray-100 pt-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900">
            Редактировать задачу
          </summary>
          <form
            className="mt-4 grid gap-3"
            action={`/api/tasks/${task.id}/update`}
            method="post"
            encType="multipart/form-data"
          >
            <TextInput label="Название" name="title" defaultValue={task.title} />
            <TextArea label="Условие" name="description" defaultValue={task.description} />
            <TaskTypeSelect defaultValue={task.type} />
            <TextArea
              label="Варианты ответов"
              name="options"
              required={false}
              defaultValue={task.options ?? ""}
              placeholder="Каждый вариант с новой строки"
            />
            <TextInput
              label="Правильный ответ"
              name="correctAnswer"
              required={false}
              defaultValue={task.correctAnswer ?? ""}
              placeholder="Для вариантов — точный текст; несколько ответов через «;»"
            />
            <TextInput label="Максимальный балл" name="maxScore" type="number" min={1} defaultValue={task.maxScore} />
            <FileInput label="Новое изображение к условию" name="image" accept="image/*" />
            <Button className="w-fit">Сохранить</Button>
          </form>
          <form className="mt-3" action={`/api/tasks/${task.id}/delete`} method="post">
            <Button variant="danger" size="sm">
              Удалить задачу
            </Button>
          </form>
        </details>
      )}

      {!isTeacher && (
        <div className="mt-4">
          {submission ? (
            <StudentSubmissionBlock task={task} submission={submission} options={options} />
          ) : (
            <SubmissionForm task={task} options={options} />
          )}
        </div>
      )}
    </article>
  );
}

function StudentSubmissionBlock({
  task,
  submission,
  options,
}: {
  task: Task;
  submission: Submission & { review: Review | null; student: User };
  options: string[];
}) {
  const isReviewed = submission.status === "REVIEWED";

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900">Ваш ответ</p>
          <SubmissionStatusBadge status={submission.status} />
        </div>

        {submission.answer && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{submission.answer}</p>
        )}
        {submission.originalFileName && (
          <a
            className="mt-2 inline-block break-all text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
            href={`/api/submissions/${submission.id}/file`}
          >
            {submission.originalFileName}
          </a>
        )}

        {isReviewed ? (
          <div className="mt-3 space-y-1 border-t border-gray-200 pt-3 text-sm text-gray-700">
            <p>
              Балл:{" "}
              <span className="font-semibold text-gray-900">
                {submission.review?.score ?? "нет"} из {task.maxScore}
              </span>
            </p>
            <p>Комментарий: {submission.review?.feedback || "нет"}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">Учитель ещё не проверил решение.</p>
        )}
      </div>

      <details className="rounded-lg border border-gray-200 p-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900">
          Изменить ответ и отправить заново
        </summary>
        <div className="mt-3">
          <SubmissionForm task={task} options={options} submission={submission} />
        </div>
      </details>
    </div>
  );
}

function SubmissionForm({
  task,
  options,
  submission,
}: {
  task: Task;
  options: string[];
  submission?: Submission;
}) {
  const selectedAnswers = submission?.answer
    ? submission.answer.split(";").map((answer) => answer.trim())
    : [];

  return (
    <form
      className="grid gap-3"
      action={`/api/tasks/${task.id}/submissions`}
      method="post"
      encType="multipart/form-data"
    >
      {task.type === "TEXT" && <TextArea label="Ответ" name="answer" defaultValue={submission?.answer ?? ""} />}
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
              defaultChecked={submission?.answer === option}
            />
            {option}
          </label>
        ))}
      {task.type === "MULTIPLE_CHOICE" &&
        options.map((option) => (
          <label
            className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 transition-colors hover:border-emerald-300"
            key={option}
          >
            <input
              className="h-4 w-4 accent-emerald-700"
              name="answer"
              type="checkbox"
              value={option}
              defaultChecked={selectedAnswers.includes(option)}
            />
            {option}
          </label>
        ))}
      {task.type === "IMAGE_UPLOAD" && (
        <FileInput
          label="Изображение"
          name="file"
          accept="image/*"
          required={!submission?.filePath}
          hint={`JPG, PNG или WebP, до ${maxUploadLabel()}`}
        />
      )}
      {task.type === "FILE_UPLOAD" && (
        <FileInput label="Файл" name="file" required={!submission?.filePath} hint={`До ${maxUploadLabel()}`} />
      )}
      {(task.type === "IMAGE_UPLOAD" || task.type === "FILE_UPLOAD") && (
        <TextArea label="Комментарий к файлу" name="answer" required={false} defaultValue={submission?.answer ?? ""} />
      )}
      <Button className="w-fit">Отправить</Button>
    </form>
  );
}

function SubmissionsTab({ submissions }: { submissions: SubmissionForTeacher[] }) {
  if (submissions.length === 0) {
    return (
      <EmptyState
        title="Решений пока нет"
        description="Здесь появятся ответы учеников на задачи группы."
      />
    );
  }

  return (
    <section className="space-y-4">
      {submissions.map((submission) => {
        const isAutoGraded = isAutoGradedTask(submission.task.type);

        const reviewForm = (
          <form
            className="mt-4 grid gap-3"
            action={`/api/submissions/${submission.id}/review`}
            method="post"
          >
            <TextInput
              label={`Балл из ${submission.task.maxScore}`}
              name="score"
              type="number"
              min={0}
              max={submission.task.maxScore}
              defaultValue={submission.review?.score}
            />
            <TextArea label="Комментарий" name="feedback" defaultValue={submission.review?.feedback} />
            <Button className="w-fit">Сохранить проверку</Button>
          </form>
        );

        return (
          <article className={cardClasses} key={submission.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900">{submission.task.title}</h3>
                <p className="mt-0.5 text-sm text-gray-600">
                  {submission.student.name} · {getTaskTypeLabel(submission.task.type)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {isAutoGraded && <Badge tone="emerald">Автопроверка</Badge>}
                {submission.review && (
                  <Badge tone="emerald">
                    {submission.review.score} из {submission.task.maxScore}
                  </Badge>
                )}
                <SubmissionStatusBadge status={submission.status} />
              </div>
            </div>
            {submission.answer && (
              <p className="mt-3 whitespace-pre-wrap rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-800">
                {submission.answer}
              </p>
            )}
            {submission.originalFileName && (
              <a
                className="mt-2 inline-block break-all text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
                href={`/api/submissions/${submission.id}/file`}
              >
                Скачать файл: {submission.originalFileName}
              </a>
            )}
            {isAutoGraded ? (
              // Балл уже выставлен автоматически — ручная форма спрятана,
              // но остаётся доступной, если учитель хочет скорректировать оценку.
              <details className="mt-4 border-t border-gray-100 pt-3">
                <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900">
                  Изменить оценку вручную
                </summary>
                {reviewForm}
              </details>
            ) : (
              <div className="mt-4 border-t border-gray-100 pt-1">{reviewForm}</div>
            )}
          </article>
        );
      })}
    </section>
  );
}

function MembersTab({
  memberships,
  isTeacher,
}: {
  memberships: GroupForPage["memberships"];
  isTeacher: boolean;
}) {
  if (memberships.length === 0) {
    return (
      <EmptyState
        title="Участников пока нет"
        description={isTeacher ? "Отправьте ученикам код приглашения группы." : undefined}
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Ученик</th>
              <th className="px-4 py-3">Проверено задач</th>
              <th className="px-4 py-3">Сумма баллов</th>
              {isTeacher && <th className="px-4 py-3">Действия</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {memberships.map((membership) => {
              const reviewed = membership.user.submissions.filter((submission) => submission.review);
              const totalScore = reviewed.reduce(
                (sum, submission) => sum + (submission.review?.score ?? 0),
                0,
              );

              return (
                <tr key={membership.user.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{membership.user.name}</td>
                  <td className="px-4 py-3 text-gray-700">{reviewed.length}</td>
                  <td className="px-4 py-3 text-gray-700">{totalScore}</td>
                  {isTeacher && (
                    <td className="px-4 py-3">
                      <form action={`/api/memberships/${membership.id}/delete`} method="post">
                        <Button variant="danger" size="sm">
                          Удалить из группы
                        </Button>
                      </form>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU").format(date);
}
