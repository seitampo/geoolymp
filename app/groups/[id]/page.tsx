import { Material, Membership, Review, Role, Submission, Task, User } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge, SubmissionStatusBadge, TaskStatusBadge } from "@/components/Badge";
import { AnchorButton, Button, LinkButton } from "@/components/Button";
import { cardClasses } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ErrorBanner } from "@/components/ErrorBanner";
import { FileInput, inputClasses, SelectField, TextArea, TextInput } from "@/components/FormFields";
import { Header } from "@/components/Header";
import { ProgressBar } from "@/components/ProgressBar";
import { getCurrentUser } from "@/lib/auth";
import {
  getMaterialTypeBadgeLabel,
  isPreviewableMaterial,
  materialTypes,
} from "@/lib/materials";
import { parseEntityId } from "@/lib/params";
import { canOpenGroup } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  formatDateTime,
  getTaskTypeLabel,
  isAutoGradedTask,
  isTaskNotYetOpen,
  isTaskOverdue,
  isTaskVisibleToStudents,
  parseTaskOptions,
  taskTypes,
  toDateTimeLocalValue,
} from "@/lib/tasks";
import { maxUploadLabel } from "@/lib/uploads";

type Tab = "materials" | "tasks" | "submissions" | "members";

type StudentTaskStatus = "not-submitted" | "pending" | "solved" | "overdue";
type TaskFilter = "all" | StudentTaskStatus;
type ReviewFilter = "all" | "pending";
type TeacherGroupOption = { id: number; name: string };

const taskFilters: { value: TaskFilter; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "not-submitted", label: "Не отправлено" },
  { value: "pending", label: "Проверяется" },
  { value: "solved", label: "Решено" },
  { value: "overdue", label: "Просрочено" },
];

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
  searchParams: Promise<{
    tab?: string;
    error?: string;
    q?: string;
    status?: string;
    filter?: string;
    after?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const { tab, error, q, status, filter, after } = await searchParams;
  const searchQuery = (q ?? "").trim();
  const statusFilter = getStatusFilter(status);
  const reviewFilter: ReviewFilter = filter === "pending" ? "pending" : "all";
  const afterId = after ? parseEntityId(after) : null;
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
        // Черновики видит только учитель; условие повторяет isTaskVisibleToStudents.
        where:
          user.role === "STUDENT"
            ? { OR: [{ isPublished: true }, { publishAt: { lte: new Date() } }] }
            : undefined,
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

  // Все группы учителя — для выбора, куда копировать задачу или материал.
  const teacherGroups: TeacherGroupOption[] = isTeacher
    ? await prisma.group.findMany({
        where: { teacherId: user.id },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  // Изученные материалы ученика — для полосок прогресса и отметок «Изучено».
  const viewedMaterialIds = new Set(
    isTeacher
      ? []
      : (
          await prisma.materialView.findMany({
            where: { userId: user.id, material: { groupId } },
            select: { materialId: true },
          })
        ).map((view) => view.materialId),
  );

  // Непросмотренные результаты проверки — пометки «Новый результат» и точка на вкладке.
  const hasUnseenResults =
    !isTeacher &&
    group.tasks.some((task) => {
      const review = task.submissions[0]?.review;
      return review != null && review.seenByStudentAt === null;
    });

  if (!isTeacher && activeTab === "tasks" && hasUnseenResults) {
    // Ученик открыл вкладку задач: снимаем пометку. Данные для рендера уже загружены,
    // поэтому в этом ответе бейджи ещё видны, а при следующем открытии исчезнут.
    await prisma.review.updateMany({
      where: { seenByStudentAt: null, submission: { studentId: user.id, task: { groupId } } },
      data: { seenByStudentAt: new Date() },
    });
  }

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

        {!isTeacher && <StudentProgress group={group} viewedMaterialIds={viewedMaterialIds} />}

        <nav className="mb-6 flex gap-2 overflow-x-auto pb-1" aria-label="Разделы группы">
          <TabLink groupId={group.id} tab="materials" activeTab={activeTab} label="Материалы" />
          <TabLink
            groupId={group.id}
            tab="tasks"
            activeTab={activeTab}
            label="Задачи"
            showDot={hasUnseenResults && activeTab !== "tasks"}
          />
          {isTeacher && (
            <TabLink groupId={group.id} tab="submissions" activeTab={activeTab} label="Решения" />
          )}
          <TabLink groupId={group.id} tab="members" activeTab={activeTab} label="Участники" />
        </nav>

        {activeTab === "materials" && (
          <MaterialsTab
            group={group}
            isTeacher={isTeacher}
            viewedMaterialIds={viewedMaterialIds}
            searchQuery={searchQuery}
            teacherGroups={teacherGroups}
          />
        )}
        {activeTab === "tasks" && (
          <TasksTab
            group={group}
            isTeacher={isTeacher}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            teacherGroups={teacherGroups}
          />
        )}
        {activeTab === "submissions" && isTeacher && (
          <SubmissionsTab
            submissions={allSubmissions}
            groupId={group.id}
            reviewFilter={reviewFilter}
            afterId={afterId}
          />
        )}
        {activeTab === "members" && (
          <MembersTab memberships={group.memberships} isTeacher={isTeacher} groupId={group.id} />
        )}
      </main>
    </>
  );
}

function StudentProgress({
  group,
  viewedMaterialIds,
}: {
  group: GroupForPage;
  viewedMaterialIds: Set<number>;
}) {
  const materialsDone = group.materials.filter((material) => viewedMaterialIds.has(material.id)).length;
  const materialsTotal = group.materials.length;

  const solvedTasks = group.tasks.filter((task) => task.submissions[0]?.status === "REVIEWED").length;
  const tasksTotal = group.tasks.length;

  // Средний балл — по проверенным решениям: среднее отношение балла к максимуму задачи.
  const reviewedRatios = group.tasks
    .map((task) => {
      const review = task.submissions[0]?.review;
      return review && task.maxScore > 0 ? review.score / task.maxScore : null;
    })
    .filter((ratio): ratio is number => ratio !== null);
  const averagePercent =
    reviewedRatios.length > 0
      ? Math.round((reviewedRatios.reduce((sum, ratio) => sum + ratio, 0) / reviewedRatios.length) * 100)
      : null;

  const toPercent = (done: number, total: number) => (total > 0 ? (done / total) * 100 : 0);

  return (
    <section className={`${cardClasses} mb-6`}>
      <h2 className="text-base font-semibold text-gray-900">Мой прогресс</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
            <span className="text-gray-600">Материалы</span>
            <span className="font-semibold text-gray-900">
              {materialsDone}/{materialsTotal}
            </span>
          </div>
          <ProgressBar percent={toPercent(materialsDone, materialsTotal)} />
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
            <span className="text-gray-600">Задачи решено</span>
            <span className="font-semibold text-gray-900">
              {solvedTasks}/{tasksTotal}
            </span>
          </div>
          <ProgressBar percent={toPercent(solvedTasks, tasksTotal)} />
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
            <span className="text-gray-600">Средний балл</span>
            <span className="font-semibold text-gray-900">
              {averagePercent === null ? "—" : `${averagePercent}%`}
            </span>
          </div>
          <ProgressBar percent={averagePercent ?? 0} />
        </div>
      </div>
    </section>
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

function getStatusFilter(value: string | undefined): TaskFilter {
  return taskFilters.some((filter) => filter.value === value) ? (value as TaskFilter) : "all";
}

/** Статус задачи глазами ученика — тот же порядок приоритетов, что у TaskStatusBadge. */
function getStudentTaskStatus(task: TaskWithStudentSubmission): StudentTaskStatus {
  const submission = task.submissions[0];

  if (submission?.status === "REVIEWED") {
    return "solved";
  }

  if (submission?.status === "PENDING") {
    return "pending";
  }

  return isTaskOverdue(task) ? "overdue" : "not-submitted";
}

function matchesSearch(item: { title: string; description: string }, normalizedQuery: string) {
  if (!normalizedQuery) {
    return true;
  }

  return (
    item.title.toLowerCase().includes(normalizedQuery) ||
    item.description.toLowerCase().includes(normalizedQuery)
  );
}

function SearchForm({
  groupId,
  tab,
  query,
  statusFilter,
  placeholder,
}: {
  groupId: number;
  tab: Tab;
  query: string;
  statusFilter?: TaskFilter;
  placeholder: string;
}) {
  const keepStatus = statusFilter && statusFilter !== "all" ? statusFilter : null;
  const resetHref = `/groups/${groupId}?tab=${tab}${keepStatus ? `&status=${keepStatus}` : ""}`;

  return (
    <form className="flex flex-col gap-2 sm:flex-row" method="get" action={`/groups/${groupId}`} role="search">
      <input type="hidden" name="tab" value={tab} />
      {keepStatus && <input type="hidden" name="status" value={keepStatus} />}
      <input
        className={`sm:max-w-xs ${inputClasses}`}
        type="search"
        name="q"
        defaultValue={query}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      <div className="flex gap-2">
        <Button variant="secondary" className="shrink-0">
          Найти
        </Button>
        {query && (
          <LinkButton href={resetHref} variant="secondary" className="shrink-0">
            Сбросить
          </LinkButton>
        )}
      </div>
    </form>
  );
}

function TaskFilterChips({
  groupId,
  active,
  query,
}: {
  groupId: number;
  active: TaskFilter;
  query: string;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Фильтр задач по статусу">
      {taskFilters.map((filter) => {
        const isActive = filter.value === active;
        const params = new URLSearchParams({ tab: "tasks" });
        if (filter.value !== "all") {
          params.set("status", filter.value);
        }
        if (query) {
          params.set("q", query);
        }

        return (
          <Link
            key={filter.value}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "border-emerald-700 bg-emerald-700 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900"
            }`}
            href={`/groups/${groupId}?${params.toString()}`}
            aria-current={isActive ? "true" : undefined}
          >
            {filter.label}
          </Link>
        );
      })}
    </div>
  );
}

function TabLink({
  groupId,
  tab,
  activeTab,
  label,
  showDot = false,
}: {
  groupId: number;
  tab: Tab;
  activeTab: Tab;
  label: string;
  showDot?: boolean;
}) {
  const isActive = tab === activeTab;

  return (
    <Link
      className={`inline-flex items-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-emerald-700 text-white"
          : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900"
      }`}
      href={`/groups/${groupId}?tab=${tab}`}
      aria-current={isActive ? "page" : undefined}
    >
      {label}
      {showDot && (
        <span
          className="ml-1.5 inline-block h-2 w-2 rounded-full bg-emerald-600"
          title="Есть новый результат"
        />
      )}
    </Link>
  );
}

/** Форма «Копировать в группу…» — общая для материалов и задач. */
function CopyForm({
  action,
  teacherGroups,
  currentGroupId,
}: {
  action: string;
  teacherGroups: TeacherGroupOption[];
  currentGroupId: number;
}) {
  return (
    <form className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:items-end" action={action} method="post">
      <div className="flex-1">
        <SelectField
          label="Копировать в группу"
          name="targetGroupId"
          defaultValue={String(currentGroupId)}
          options={teacherGroups.map((option) => ({
            value: String(option.id),
            label: option.id === currentGroupId ? `${option.name} (эта группа)` : option.name,
          }))}
        />
      </div>
      <Button variant="secondary" className="shrink-0">
        Копировать
      </Button>
    </form>
  );
}

function MaterialsTab({
  group,
  isTeacher,
  viewedMaterialIds,
  searchQuery,
  teacherGroups,
}: {
  group: GroupForPage;
  isTeacher: boolean;
  viewedMaterialIds: Set<number>;
  searchQuery: string;
  teacherGroups: TeacherGroupOption[];
}) {
  const normalizedQuery = searchQuery.toLowerCase();
  const visibleMaterials = group.materials.filter((material) => matchesSearch(material, normalizedQuery));

  return (
    <section className="space-y-5">
      {group.materials.length > 0 && (
        <SearchForm
          groupId={group.id}
          tab="materials"
          query={searchQuery}
          placeholder="Поиск по материалам"
        />
      )}
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

      {group.materials.length === 0 ? (
        <EmptyState
          title="Материалов пока нет"
          description={
            isTeacher
              ? "Добавьте первый материал: файл или ссылку на внешний ресурс."
              : "Учитель ещё не добавил материалы в эту группу."
          }
        />
      ) : visibleMaterials.length === 0 ? (
        <EmptyState
          title="Ничего не найдено"
          description={`По запросу «${searchQuery}» материалов нет. Попробуйте изменить запрос.`}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleMaterials.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              isTeacher={isTeacher}
              viewed={viewedMaterialIds.has(material.id)}
              teacherGroups={teacherGroups}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function MaterialCard({
  material,
  isTeacher,
  viewed,
  teacherGroups,
}: {
  material: Material;
  isTeacher: boolean;
  viewed: boolean;
  teacherGroups: TeacherGroupOption[];
}) {
  // Открытие и скачивание идут через API даже для ссылок (роут редиректит на url):
  // так фиксируется отметка «изучено» для прогресса ученика.
  const openHref = `/api/materials/${material.id}/file?open=1`;
  const downloadHref = `/api/materials/${material.id}/download`;
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
        <div className="flex flex-wrap justify-end gap-1.5">
          {!isTeacher && viewed && <Badge tone="green">Изучено</Badge>}
          <Badge>{getMaterialTypeBadgeLabel(material.type)}</Badge>
        </div>
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
      {!isTeacher && !hasContent && !viewed && (
        <form className="mt-4" action={`/api/materials/${material.id}/viewed`} method="post">
          <Button variant="secondary" size="sm">
            Отметить изученным
          </Button>
        </form>
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
          <CopyForm
            action={`/api/materials/${material.id}/copy`}
            teacherGroups={teacherGroups}
            currentGroupId={material.groupId}
          />
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

function TasksTab({
  group,
  isTeacher,
  searchQuery,
  statusFilter,
  teacherGroups,
}: {
  group: GroupForPage;
  isTeacher: boolean;
  searchQuery: string;
  statusFilter: TaskFilter;
  teacherGroups: TeacherGroupOption[];
}) {
  const normalizedQuery = searchQuery.toLowerCase();
  const visibleTasks = group.tasks.filter((task) => {
    const matchesStatus =
      isTeacher || statusFilter === "all" || getStudentTaskStatus(task) === statusFilter;
    return matchesStatus && matchesSearch(task, normalizedQuery);
  });
  const hasActiveFilter = Boolean(searchQuery) || (!isTeacher && statusFilter !== "all");

  return (
    <section className="space-y-5">
      {group.tasks.length > 0 && (
        <div className="space-y-3">
          <SearchForm
            groupId={group.id}
            tab="tasks"
            query={searchQuery}
            statusFilter={isTeacher ? undefined : statusFilter}
            placeholder="Поиск по задачам"
          />
          {!isTeacher && (
            <TaskFilterChips groupId={group.id} active={statusFilter} query={searchQuery} />
          )}
        </div>
      )}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Дата открытия (необязательно)" name="opensAt" type="datetime-local" required={false} />
            <TextInput label="Срок сдачи (необязательно)" name="dueAt" type="datetime-local" required={false} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <PublishSelect />
            <TextInput
              label="Дата публикации (для черновика)"
              name="publishAt"
              type="datetime-local"
              required={false}
            />
          </div>
          <FileInput
            label="Изображение к условию"
            name="image"
            accept="image/*"
            hint={`JPG, PNG или WebP, до ${maxUploadLabel()}`}
          />
          <Button className="w-fit">Создать</Button>
        </form>
      )}

      {group.tasks.length === 0 ? (
        <EmptyState
          title="Задач пока нет"
          description={
            isTeacher
              ? "Создайте первую задачу — ученики увидят её на этой вкладке."
              : "Учитель ещё не добавил задачи в эту группу."
          }
        />
      ) : visibleTasks.length === 0 ? (
        <EmptyState
          title="Ничего не найдено"
          description={
            hasActiveFilter
              ? "Попробуйте изменить поисковый запрос или фильтр по статусу."
              : "Задачи не найдены."
          }
        />
      ) : (
        <div className="space-y-4">
          {visibleTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isTeacher={isTeacher}
              teacherGroups={teacherGroups}
              membersCount={group.memberships.length}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TaskTypeSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <SelectField label="Тип задачи" name="type" defaultValue={defaultValue ?? "TEXT"} options={taskTypes} />
  );
}

function PublishSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <SelectField
      label="Статус публикации"
      name="published"
      defaultValue={defaultValue ?? "published"}
      options={[
        { value: "published", label: "Опубликована" },
        { value: "draft", label: "Черновик (виден только вам)" },
      ]}
    />
  );
}

/** Статистика по задаче для учителя: сдачи, средний балл, частота вариантов. */
function TaskStats({
  task,
  options,
  membersCount,
}: {
  task: TaskWithStudentSubmission;
  options: string[];
  membersCount: number;
}) {
  const submitted = task.submissions.length;
  const reviewed = task.submissions.filter((submission) => submission.review);
  const averageScore =
    reviewed.length > 0
      ? reviewed.reduce((sum, submission) => sum + (submission.review?.score ?? 0), 0) / reviewed.length
      : null;

  const optionStats = isAutoGradedTask(task.type)
    ? options.map((option) => ({
        option,
        isCorrect:
          task.correctAnswer
            ?.split(";")
            .map((value) => value.trim())
            .includes(option) ?? false,
        count: task.submissions.filter((submission) =>
          submission.answer
            .split(";")
            .map((value) => value.trim())
            .includes(option),
        ).length,
      }))
    : [];

  return (
    <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm">
      <p className="text-gray-700">
        Сдали: <span className="font-semibold text-gray-900">{submitted} из {membersCount}</span>
        {" · "}Средний балл:{" "}
        <span className="font-semibold text-gray-900">
          {averageScore === null ? "—" : `${formatScore(averageScore)} из ${task.maxScore}`}
        </span>
      </p>
      {optionStats.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {optionStats.map(({ option, count, isCorrect }) => (
            <div className="flex items-center gap-2" key={option}>
              <span className={`w-40 shrink-0 truncate text-xs ${isCorrect ? "font-medium text-emerald-800" : "text-gray-600"}`}>
                {isCorrect ? "✓ " : ""}
                {option}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full ${isCorrect ? "bg-emerald-600" : "bg-gray-400"}`}
                  style={{ width: submitted > 0 ? `${(count / submitted) * 100}%` : "0%" }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-xs text-gray-600">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function TaskCard({
  task,
  isTeacher,
  teacherGroups,
  membersCount,
}: {
  task: TaskWithStudentSubmission;
  isTeacher: boolean;
  teacherGroups: TeacherGroupOption[];
  membersCount: number;
}) {
  const submission = task.submissions[0];
  const options = parseTaskOptions(task.options);
  const notYetOpen = isTaskNotYetOpen(task);
  const overdue = isTaskOverdue(task);
  const hasNewResult = !isTeacher && submission?.review != null && submission.review.seenByStudentAt === null;
  const visibleToStudents = isTaskVisibleToStudents(task);

  return (
    <article className={cardClasses}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900">{task.title}</h3>
        <div className="flex flex-wrap gap-1.5">
          {hasNewResult && <Badge tone="emerald">Новый результат</Badge>}
          {!isTeacher && <TaskStatusBadge status={submission?.status ?? null} overdue={overdue} />}
          {isTeacher && !visibleToStudents &&
            (task.publishAt ? (
              <Badge tone="amber">Публикация: {formatDateTime(task.publishAt)}</Badge>
            ) : (
              <Badge tone="amber">Черновик</Badge>
            ))}
          <Badge>{getTaskTypeLabel(task.type)}</Badge>
          <Badge tone="emerald">Макс. балл: {task.maxScore}</Badge>
        </div>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{task.description}</p>
      {(task.opensAt || task.dueAt) && (
        <p className="mt-2 text-xs text-gray-500">
          {task.opensAt && <>Открытие: {formatDateTime(task.opensAt)}</>}
          {task.opensAt && task.dueAt && " · "}
          {task.dueAt && <>Срок сдачи: {formatDateTime(task.dueAt)}</>}
        </p>
      )}
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

      {isTeacher && <TaskStats task={task} options={options} membersCount={membersCount} />}

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
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput
                label="Дата открытия (необязательно)"
                name="opensAt"
                type="datetime-local"
                required={false}
                defaultValue={toDateTimeLocalValue(task.opensAt)}
              />
              <TextInput
                label="Срок сдачи (необязательно)"
                name="dueAt"
                type="datetime-local"
                required={false}
                defaultValue={toDateTimeLocalValue(task.dueAt)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <PublishSelect defaultValue={task.isPublished ? "published" : "draft"} />
              <TextInput
                label="Дата публикации (для черновика)"
                name="publishAt"
                type="datetime-local"
                required={false}
                defaultValue={toDateTimeLocalValue(task.publishAt)}
              />
            </div>
            <FileInput label="Новое изображение к условию" name="image" accept="image/*" />
            <Button className="w-fit">Сохранить</Button>
          </form>
          <form className="mt-3" action={`/api/tasks/${task.id}/delete`} method="post">
            <Button variant="danger" size="sm">
              Удалить задачу
            </Button>
          </form>
          <CopyForm
            action={`/api/tasks/${task.id}/copy`}
            teacherGroups={teacherGroups}
            currentGroupId={task.groupId}
          />
        </details>
      )}

      {!isTeacher && (
        <div className="mt-4">
          {notYetOpen ? (
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
              Задача откроется {formatDateTime(task.opensAt!)} — отправка пока недоступна.
            </p>
          ) : submission ? (
            <StudentSubmissionBlock
              task={task}
              submission={submission}
              options={options}
              canResubmit={!overdue}
            />
          ) : overdue ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Срок сдачи истёк {formatDateTime(task.dueAt!)} — отправка недоступна.
            </p>
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
  canResubmit,
}: {
  task: Task;
  submission: Submission & { review: Review | null; student: User };
  options: string[];
  canResubmit: boolean;
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

      {canResubmit ? (
        <details className="rounded-lg border border-gray-200 p-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900">
            Изменить ответ и отправить заново
          </summary>
          <div className="mt-3">
            <SubmissionForm task={task} options={options} submission={submission} />
          </div>
        </details>
      ) : (
        <p className="text-xs text-gray-500">Срок сдачи истёк — изменить ответ уже нельзя.</p>
      )}
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

function SubmissionsTab({
  submissions,
  groupId,
  reviewFilter,
  afterId,
}: {
  submissions: SubmissionForTeacher[];
  groupId: number;
  reviewFilter: ReviewFilter;
  afterId: number | null;
}) {
  if (submissions.length === 0) {
    return (
      <EmptyState
        title="Решений пока нет"
        description="Здесь появятся ответы учеников на задачи группы."
      />
    );
  }

  const pendingCount = submissions.filter((submission) => submission.status === "PENDING").length;
  const filterChips = (
    <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Режим проверки">
      {[
        { value: "all" as const, label: `Все (${submissions.length})` },
        { value: "pending" as const, label: `На проверке (${pendingCount})` },
      ].map((chip) => {
        const isActive = chip.value === reviewFilter;
        return (
          <Link
            key={chip.value}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "border-emerald-700 bg-emerald-700 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900"
            }`}
            href={`/groups/${groupId}?tab=submissions${chip.value === "pending" ? "&filter=pending" : ""}`}
            aria-current={isActive ? "true" : undefined}
          >
            {chip.label}
          </Link>
        );
      })}
    </div>
  );

  if (reviewFilter === "pending") {
    return (
      <section className="space-y-4">
        {filterChips}
        <ReviewQueue submissions={submissions} groupId={groupId} afterId={afterId} />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {filterChips}
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

/**
 * Очередь проверки: показывает по одному непроверенному решению (старые сначала).
 * После сохранения проверки страница возвращается в очередь, и следующее
 * непроверенное оказывается сверху; «Пропустить» листает без оценки.
 */
function ReviewQueue({
  submissions,
  groupId,
  afterId,
}: {
  submissions: SubmissionForTeacher[];
  groupId: number;
  afterId: number | null;
}) {
  const pending = submissions
    .filter((submission) => submission.status === "PENDING")
    .sort((a, b) => a.id - b.id);

  if (pending.length === 0) {
    return (
      <EmptyState
        title="Всё проверено"
        description="Непроверенных решений не осталось — отличная работа!"
      />
    );
  }

  const queue = afterId === null ? pending : pending.filter((submission) => submission.id > afterId);
  const current = queue[0];

  if (!current) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="Конец очереди"
          description={`Остались только пропущенные решения (${pending.length}). Начните сначала, чтобы вернуться к ним.`}
        />
        <div className="text-center">
          <LinkButton href={`/groups/${groupId}?tab=submissions&filter=pending`} variant="primary">
            Начать сначала
          </LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Осталось в очереди: <span className="font-semibold text-gray-900">{queue.length}</span>
      </p>
      <article className={cardClasses}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900">{current.task.title}</h3>
            <p className="mt-0.5 text-sm text-gray-600">
              {current.student.name} · {getTaskTypeLabel(current.task.type)}
            </p>
          </div>
          <SubmissionStatusBadge status={current.status} />
        </div>
        {current.answer && (
          <p className="mt-3 whitespace-pre-wrap rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-800">
            {current.answer}
          </p>
        )}
        {current.originalFileName && (
          <a
            className="mt-2 inline-block break-all text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
            href={`/api/submissions/${current.id}/file`}
          >
            Скачать файл: {current.originalFileName}
          </a>
        )}
        <form
          className="mt-4 grid gap-3 border-t border-gray-100 pt-4"
          action={`/api/submissions/${current.id}/review`}
          method="post"
        >
          <input type="hidden" name="filter" value="pending" />
          <TextInput
            label={`Балл из ${current.task.maxScore}`}
            name="score"
            type="number"
            min={0}
            max={current.task.maxScore}
          />
          <TextArea label="Комментарий" name="feedback" />
          <div className="flex flex-wrap gap-2">
            <Button className="w-fit">Сохранить и дальше</Button>
            <LinkButton
              href={`/groups/${groupId}?tab=submissions&filter=pending&after=${current.id}`}
              variant="secondary"
            >
              Пропустить
            </LinkButton>
          </div>
        </form>
      </article>
    </div>
  );
}

function MembersTab({
  memberships,
  isTeacher,
  groupId,
}: {
  memberships: GroupForPage["memberships"];
  isTeacher: boolean;
  groupId: number;
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
    <section className="space-y-4">
      {isTeacher && (
        <div className="flex justify-end">
          <AnchorButton href={`/api/groups/${groupId}/export`} variant="secondary" size="sm">
            Экспорт результатов в CSV
          </AnchorButton>
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
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
      </div>
    </section>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU").format(date);
}
