import { Material, Membership, Review, Submission, Task, User } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { TextArea, TextInput } from "@/components/FormFields";
import { getCurrentUser } from "@/lib/auth";
import { getMaterialTypeLabel, isPreviewableMaterial, materialTypes } from "@/lib/materials";
import { canOpenGroup } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getTaskTypeLabel, parseTaskOptions, taskTypes } from "@/lib/tasks";

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
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const { tab } = await searchParams;
  const groupId = Number(id);

  if (!Number.isInteger(groupId) || !(await canOpenGroup(user.id, groupId))) {
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

  const allSubmissions = await prisma.submission.findMany({
    where: { task: { groupId } },
    include: { student: true, task: true, review: true },
    orderBy: { id: "desc" },
  });

  return (
    <>
      <Header user={user} />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <Link className="mb-3 inline-block text-gray-600 underline" href="/dashboard">
              Назад к группам
            </Link>
            <h1 className="text-2xl font-semibold">{group.name}</h1>
            <p className="mt-2 text-gray-700">{group.description}</p>
            {user.role === "TEACHER" && <p className="mt-2 text-gray-600">Код: {group.inviteCode}</p>}
          </div>
          {user.role === "TEACHER" && (
            <form action={`/api/groups/${group.id}/delete`} method="post">
              <button className="border border-gray-300 px-3 py-2" type="submit">
                Удалить группу
              </button>
            </form>
          )}
        </div>

        <nav className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
          <TabLink groupId={group.id} tab="materials" activeTab={activeTab} label="Материалы" />
          <TabLink groupId={group.id} tab="tasks" activeTab={activeTab} label="Задачи" />
          {user.role === "TEACHER" && (
            <TabLink groupId={group.id} tab="submissions" activeTab={activeTab} label="Решения" />
          )}
          <TabLink groupId={group.id} tab="members" activeTab={activeTab} label="Участники" />
        </nav>

        {activeTab === "materials" && <MaterialsTab group={group} isTeacher={user.role === "TEACHER"} />}
        {activeTab === "tasks" && <TasksTab group={group} isTeacher={user.role === "TEACHER"} />}
        {activeTab === "submissions" && user.role === "TEACHER" && (
          <SubmissionsTab submissions={allSubmissions} />
        )}
        {activeTab === "members" && (
          <MembersTab groupId={group.id} memberships={group.memberships} isTeacher={user.role === "TEACHER"} />
        )}
      </main>
    </>
  );
}

function getActiveTab(tab: string | undefined, role: string): Tab {
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
      className={`border border-gray-300 px-3 py-2 ${isActive ? "bg-gray-100" : "bg-white"}`}
      href={`/groups/${groupId}?tab=${tab}`}
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
          className="grid gap-4 border border-gray-200 p-4"
          action={`/api/groups/${group.id}/materials`}
          method="post"
          encType="multipart/form-data"
        >
          <h2 className="text-lg font-medium">Добавить материал</h2>
          <TextInput label="Название" name="title" />
          <TextArea label="Описание" name="description" />
          <MaterialTypeSelect />
          <TextInput label="Ссылка на внешний ресурс" name="url" type="url" required={false} />
          <label className="block">
            <span className="mb-1 block text-gray-700">Файл</span>
            <input className="w-full border border-gray-300 px-3 py-2" name="file" type="file" />
          </label>
          <button className="w-fit border border-gray-300 px-4 py-2" type="submit">
            Добавить
          </button>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {group.materials.map((material) => (
          <MaterialCard key={material.id} material={material} isTeacher={isTeacher} />
        ))}
      </div>

      {group.materials.length === 0 && <p className="text-gray-700">Материалов пока нет.</p>}
    </section>
  );
}

function MaterialCard({ material, isTeacher }: { material: Material; isTeacher: boolean }) {
  const openHref = material.url ?? `/api/materials/${material.id}/file`;
  const downloadHref = material.url ?? `/api/materials/${material.id}/download`;

  return (
    <article className="border border-gray-200 p-4">
      {isPreviewableMaterial(material.type) && material.filePath && (
        <div className="mb-3 h-44 overflow-hidden border border-gray-200 bg-gray-50">
          {material.type === "IMAGE" ? (
            <img className="h-full w-full object-cover" src={`/api/materials/${material.id}/file`} alt={material.title} />
          ) : (
            <iframe className="h-full w-full" src={`/api/materials/${material.id}/file`} title={material.title} />
          )}
        </div>
      )}
      <h3 className="font-medium">{material.title}</h3>
      <p className="mt-1 text-gray-700">{material.description}</p>
      <div className="mt-3 space-y-1 text-gray-600">
        <p>Тип: {getMaterialTypeLabel(material.type)}</p>
        <p>Дата загрузки: {formatDate(material.uploadedAt)}</p>
        {material.originalFileName && <p>Файл: {material.originalFileName}</p>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <a className="border border-gray-300 px-3 py-1" href={openHref} target="_blank">
          Открыть
        </a>
        <a className="border border-gray-300 px-3 py-1" href={downloadHref}>
          Скачать
        </a>
      </div>
      {isTeacher && (
        <details className="mt-4 border-t border-gray-200 pt-4">
          <summary className="cursor-pointer">Редактировать</summary>
          <form
            className="mt-4 grid gap-3"
            action={`/api/materials/${material.id}/update`}
            method="post"
            encType="multipart/form-data"
          >
            <TextInput label="Название" name="title" defaultValue={material.title} />
            <TextArea label="Описание" name="description" defaultValue={material.description} />
            <MaterialTypeSelect defaultValue={material.type} />
            <TextInput label="Ссылка на внешний ресурс" name="url" type="url" required={false} defaultValue={material.url ?? ""} />
            <label className="block">
              <span className="mb-1 block text-gray-700">Новый файл</span>
              <input className="w-full border border-gray-300 px-3 py-2" name="file" type="file" />
            </label>
            <button className="w-fit border border-gray-300 px-4 py-2" type="submit">
              Сохранить
            </button>
          </form>
          <form className="mt-3" action={`/api/materials/${material.id}/delete`} method="post">
            <button className="border border-gray-300 px-3 py-1" type="submit">
              Удалить
            </button>
          </form>
        </details>
      )}
    </article>
  );
}

function MaterialTypeSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-gray-700">Тип материала</span>
      <select className="w-full border border-gray-300 px-3 py-2" name="type" defaultValue={defaultValue ?? "LINK"}>
        {materialTypes.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TasksTab({ group, isTeacher }: { group: GroupForPage; isTeacher: boolean }) {
  return (
    <section className="space-y-5">
      {isTeacher && (
        <form
          className="grid gap-4 border border-gray-200 p-4"
          action={`/api/groups/${group.id}/tasks`}
          method="post"
          encType="multipart/form-data"
        >
          <h2 className="text-lg font-medium">Создать задачу</h2>
          <TextInput label="Название" name="title" />
          <TextArea label="Условие" name="description" />
          <TaskTypeSelect />
          <TextArea
            label="Варианты ответов"
            name="options"
            required={false}
            placeholder="Каждый вариант с новой строки"
          />
          <TextInput label="Правильный ответ" name="correctAnswer" required={false} />
          <TextInput label="Максимальный балл" name="maxScore" type="number" />
          <label className="block">
            <span className="mb-1 block text-gray-700">Изображение к условию</span>
            <input className="w-full border border-gray-300 px-3 py-2" name="image" type="file" accept="image/*" />
          </label>
          <button className="w-fit border border-gray-300 px-4 py-2" type="submit">
            Создать
          </button>
        </form>
      )}

      <div className="space-y-3">
        {group.tasks.map((task) => (
          <TaskCard key={task.id} task={task} isTeacher={isTeacher} />
        ))}
        {group.tasks.length === 0 && <p className="text-gray-700">Задач пока нет.</p>}
      </div>
    </section>
  );
}

function TaskTypeSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-gray-700">Тип задачи</span>
      <select className="w-full border border-gray-300 px-3 py-2" name="type" defaultValue={defaultValue ?? "TEXT"}>
        {taskTypes.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TaskCard({ task, isTeacher }: { task: TaskWithStudentSubmission; isTeacher: boolean }) {
  const submission = task.submissions[0];
  const options = parseTaskOptions(task.options);

  return (
    <article className="border border-gray-200 p-4">
      <h3 className="font-medium">{task.title}</h3>
      <p className="mt-1 whitespace-pre-wrap text-gray-700">{task.description}</p>
      {task.imagePath && (
        <img className="mt-3 max-h-80 border border-gray-200 object-contain" src={`/api/tasks/${task.id}/image`} alt={task.title} />
      )}
      <p className="mt-2 text-gray-600">Тип: {getTaskTypeLabel(task.type)}</p>
      <p className="text-gray-600">Максимум: {task.maxScore}</p>
      {isTeacher && task.correctAnswer && <p className="mt-2 text-gray-700">Правильный ответ: {task.correctAnswer}</p>}

      {isTeacher && (
        <details className="mt-4 border-t border-gray-200 pt-4">
          <summary className="cursor-pointer">Редактировать задачу</summary>
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
            />
            <TextInput label="Максимальный балл" name="maxScore" type="number" defaultValue={task.maxScore} />
            <label className="block">
              <span className="mb-1 block text-gray-700">Новое изображение к условию</span>
              <input className="w-full border border-gray-300 px-3 py-2" name="image" type="file" accept="image/*" />
            </label>
            <button className="w-fit border border-gray-300 px-4 py-2" type="submit">
              Сохранить
            </button>
          </form>
          <form className="mt-3" action={`/api/tasks/${task.id}/delete`} method="post">
            <button className="border border-gray-300 px-3 py-1" type="submit">
              Удалить задачу
            </button>
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
      <div className="border border-gray-200 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">Ваш ответ</p>
          <span className="border border-gray-300 px-2 py-1 text-xs">
            {isReviewed ? "Проверено" : "На проверке"}
          </span>
        </div>

        {submission.answer && <p className="mt-2 whitespace-pre-wrap">{submission.answer}</p>}
        {submission.originalFileName && (
          <a className="mt-2 inline-block underline" href={`/api/submissions/${submission.id}/file`}>
            {submission.originalFileName}
          </a>
        )}

        {isReviewed ? (
          <div className="mt-3 border-t border-gray-200 pt-3">
            <p>Балл: {submission.review?.score ?? "нет"}</p>
            <p>Комментарий: {submission.review?.feedback || "нет"}</p>
          </div>
        ) : (
          <p className="mt-3 text-gray-700">Учитель ещё не проверил решение.</p>
        )}
      </div>

      <details className="border border-gray-200 p-3">
        <summary className="cursor-pointer">Изменить ответ и отправить заново</summary>
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
    <form className="grid gap-3" action={`/api/tasks/${task.id}/submissions`} method="post" encType="multipart/form-data">
      {task.type === "TEXT" && <TextArea label="Ответ" name="answer" defaultValue={submission?.answer ?? ""} />}
      {task.type === "SINGLE_CHOICE" &&
        options.map((option) => (
          <label className="block" key={option}>
            <input
              className="mr-2"
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
          <label className="block" key={option}>
            <input className="mr-2" name="answer" type="checkbox" value={option} defaultChecked={selectedAnswers.includes(option)} />
            {option}
          </label>
        ))}
      {task.type === "IMAGE_UPLOAD" && (
        <label className="block">
          <span className="mb-1 block text-gray-700">Изображение</span>
          <input
            className="w-full border border-gray-300 px-3 py-2"
            name="file"
            type="file"
            accept="image/*"
            required={!submission?.filePath}
          />
        </label>
      )}
      {task.type === "FILE_UPLOAD" && (
        <label className="block">
          <span className="mb-1 block text-gray-700">Файл</span>
          <input className="w-full border border-gray-300 px-3 py-2" name="file" type="file" required={!submission?.filePath} />
        </label>
      )}
      {(task.type === "IMAGE_UPLOAD" || task.type === "FILE_UPLOAD") && (
        <TextArea label="Комментарий к файлу" name="answer" required={false} defaultValue={submission?.answer ?? ""} />
      )}
      <button className="w-fit border border-gray-300 px-4 py-2" type="submit">
        Отправить
      </button>
    </form>
  );
}

function SubmissionsTab({ submissions }: { submissions: SubmissionForTeacher[] }) {
  return (
    <section className="space-y-3">
      {submissions.map((submission) => (
        <article className="border border-gray-200 p-4" key={submission.id}>
          <h3 className="font-medium">{submission.task.title}</h3>
          <p className="mt-1 text-gray-700">Ученик: {submission.student.name}</p>
          <p className="mt-1 text-gray-700">Тип задачи: {getTaskTypeLabel(submission.task.type)}</p>
          {submission.answer && <p className="mt-2 whitespace-pre-wrap">{submission.answer}</p>}
          {submission.originalFileName && (
            <a className="mt-2 inline-block underline" href={`/api/submissions/${submission.id}/file`}>
              Скачать файл: {submission.originalFileName}
            </a>
          )}
          <p className="mt-2 text-gray-700">
            Статус: {submission.status === "REVIEWED" ? "Проверено" : "На проверке"}
          </p>
          <form className="mt-4 grid gap-3" action={`/api/submissions/${submission.id}/review`} method="post">
            <TextInput label={`Балл из ${submission.task.maxScore}`} name="score" type="number" />
            <TextArea label="Комментарий" name="feedback" />
            <button className="w-fit border border-gray-300 px-4 py-2" type="submit">
              Сохранить проверку
            </button>
          </form>
        </article>
      ))}
      {submissions.length === 0 && <p className="text-gray-700">Решений пока нет.</p>}
    </section>
  );
}

function MembersTab({
  memberships,
  isTeacher,
}: {
  groupId: number;
  memberships: GroupForPage["memberships"];
  isTeacher: boolean;
}) {
  return (
    <section>
      <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 px-3 py-2 text-left">Ученик</th>
            <th className="border border-gray-200 px-3 py-2 text-left">Проверено задач</th>
            <th className="border border-gray-200 px-3 py-2 text-left">Сумма баллов</th>
            {isTeacher && <th className="border border-gray-200 px-3 py-2 text-left">Действия</th>}
          </tr>
        </thead>
        <tbody>
          {memberships.map((membership) => {
            const reviewed = membership.user.submissions.filter((submission) => submission.review);
            const totalScore = reviewed.reduce((sum, submission) => sum + (submission.review?.score ?? 0), 0);

            return (
              <tr key={membership.user.id}>
                <td className="border border-gray-200 px-3 py-2">{membership.user.name}</td>
                <td className="border border-gray-200 px-3 py-2">{reviewed.length}</td>
                <td className="border border-gray-200 px-3 py-2">{totalScore}</td>
                {isTeacher && (
                  <td className="border border-gray-200 px-3 py-2">
                    <form action={`/api/memberships/${membership.id}/delete`} method="post">
                      <button className="border border-gray-300 px-3 py-1" type="submit">
                        Удалить из группы
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {memberships.length === 0 && <p className="mt-4 text-gray-700">Участников пока нет.</p>}
    </section>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU").format(date);
}
