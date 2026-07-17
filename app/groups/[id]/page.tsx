import { Material, Membership, OlympiadLevel, Review, Role, Submission, Task, TaskSet, User } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { AnchorButton, Button, LinkButton } from "@/components/Button";
import { cardClasses } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { CopyButton } from "@/components/CopyButton";
import { ErrorBanner, SuccessBanner } from "@/components/ErrorBanner";
import { FileInput, inputClasses, SelectField, TextArea, TextInput } from "@/components/FormFields";
import { Header } from "@/components/Header";
import { MapPointEditor } from "@/components/MapPoint";
import { mapEditorLabels } from "@/lib/mapLabels";
import { ProgressBar } from "@/components/ProgressBar";
import {
  CopyForm,
  PublishSelect,
  TaskCard,
  TaskClassificationBadges,
  TaskClassificationFields,
  TaskTypeSelect,
  type TaskWithStudentSubmission,
  type TeacherGroupOption,
} from "@/components/TaskCard";
import { getCurrentUser } from "@/lib/auth";
import { getT, type TFunction, type TranslationKey } from "@/lib/i18n";
import { isPreviewableMaterial, materialTypes } from "@/lib/materials";
import { parseEntityId } from "@/lib/params";
import { canOpenGroup } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  isAutoCheckedTask,
  isTaskOverdue,
  olympiadLevels,
  parseClassificationNumber,
  taskDifficulties,
  taskGrades,
  validateOlympiadLevel,
} from "@/lib/tasks";
import { getTrainingTaskIds, notInTrainingSetFilter } from "@/lib/training";
import { maxUploadLabel } from "@/lib/uploads";

type Tab = "materials" | "tasks" | "sets" | "submissions" | "members";

type StudentTaskStatus = "not-submitted" | "pending" | "solved" | "overdue";
type TaskFilter = "all" | StudentTaskStatus;
type ReviewFilter = "all" | "pending";
type LibraryTask = Task & { group: { name: string } };

const taskFilters: { value: TaskFilter; key: TranslationKey }[] = [
  { value: "all", key: "filter.all" },
  { value: "not-submitted", key: "filter.notSubmitted" },
  { value: "pending", key: "filter.pending" },
  { value: "solved", key: "filter.solved" },
  { value: "overdue", key: "filter.overdue" },
];

/** Ключ перевода для значения enum (тип задачи, статус, уровень, тип материала). */
function enumKey(prefix: string, value: string): TranslationKey {
  return `${prefix}.${value}` as TranslationKey;
}

type GroupForPage = {
  id: number;
  name: string;
  description: string;
  inviteCode: string;
  materials: Material[];
  tasks: TaskWithStudentSubmission[];
  taskSets: (TaskSet & { _count: { items: number } })[];
  memberships: (Membership & {
    user: User & {
      submissions: (Submission & { review: Review | null })[];
    };
  })[];
};

type ClassificationFilters = {
  grade: number | null;
  level: OlympiadLevel | null;
  difficulty: number | null;
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
    ok?: string;
    q?: string;
    status?: string;
    filter?: string;
    after?: string;
    grade?: string;
    level?: string;
    difficulty?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const { tab, error, ok, q, status, filter, after, grade, level, difficulty } = await searchParams;
  const t = await getT();
  const searchQuery = (q ?? "").trim();
  const statusFilter = getStatusFilter(status);
  const reviewFilter: ReviewFilter = filter === "pending" ? "pending" : "all";
  const afterId = after ? parseEntityId(after) : null;
  // Кривые значения фильтров из URL просто игнорируем (фильтр не применяется).
  const classification: ClassificationFilters = {
    grade: parseClassificationNumber(grade ?? "", taskGrades) ?? null,
    level: validateOlympiadLevel(level ?? ""),
    difficulty: parseClassificationNumber(difficulty ?? "", taskDifficulties) ?? null,
  };
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
        // Черновики видит только учитель (условие повторяет isTaskVisibleToStudents),
        // а тренировочные задачи для ученика существуют только внутри тренировки.
        where:
          user.role === "STUDENT"
            ? {
                OR: [{ isPublished: true }, { publishAt: { lte: new Date() } }],
                ...notInTrainingSetFilter,
              }
            : undefined,
        include: {
          submissions: {
            where: user.role === "STUDENT" ? { studentId: user.id } : undefined,
            include: { review: true, student: true },
          },
        },
      },
      taskSets: {
        orderBy: { id: "asc" },
        include: { _count: { select: { items: true } } },
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

  // Задачи, занятые в тренировочных подборках, — учителю показываем бейдж-предупреждение.
  const trainingTaskIds =
    isTeacher && activeTab === "tasks" ? await getTrainingTaskIds(groupId) : new Set<number>();

  // Библиотека: задачи учителя из других его групп — для переиспользования копией.
  const libraryTasks: LibraryTask[] =
    isTeacher && activeTab === "tasks"
      ? await prisma.task.findMany({
          where: { group: { teacherId: user.id }, groupId: { not: groupId } },
          include: { group: { select: { name: true } } },
          orderBy: { id: "desc" },
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
        <SuccessBanner message={ok} />

        <div className="mb-6">
          <Link
            className="mb-4 inline-flex items-center gap-1 text-sm text-ink-mute transition-colors hover:text-ink"
            href="/dashboard"
          >
            <span aria-hidden="true">←</span> {t("group.back")}
          </Link>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-heading text-xl font-semibold tracking-tight text-ink">{group.name}</h1>
              <p className="mt-1 text-sm text-ink-soft">{group.description}</p>
              {isTeacher && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge tone="emerald">
                    {t("group.inviteCode")}: <span className="font-mono">{group.inviteCode}</span>
                  </Badge>
                  <CopyButton value={group.inviteCode} />
                </div>
              )}
            </div>
            {isTeacher && (
              <form
                className="shrink-0"
                action={`/api/groups/${group.id}/delete`}
                method="post"
                data-confirm={t("task.groupDeleteConfirm")}
              >
                <Button variant="danger" size="sm">
                  {t("group.deleteGroup")}
                </Button>
              </form>
            )}
          </div>
        </div>

        {!isTeacher && <StudentProgress group={group} viewedMaterialIds={viewedMaterialIds} t={t} />}

        <nav className="mb-6 flex gap-2 overflow-x-auto pb-1" aria-label={t("group.navAria")}>
          <TabLink groupId={group.id} tab="materials" activeTab={activeTab} label={t("group.tabMaterials")} />
          <TabLink
            groupId={group.id}
            tab="tasks"
            activeTab={activeTab}
            label={t("group.tabTasks")}
            showDot={hasUnseenResults && activeTab !== "tasks"}
            dotTitle={t("group.newResultDot")}
          />
          <TabLink groupId={group.id} tab="sets" activeTab={activeTab} label={t("group.tabSets")} />
          {isTeacher && (
            <TabLink groupId={group.id} tab="submissions" activeTab={activeTab} label={t("group.tabSubmissions")} />
          )}
          <TabLink groupId={group.id} tab="members" activeTab={activeTab} label={t("group.tabMembers")} />
        </nav>

        {activeTab === "materials" && (
          <MaterialsTab
            group={group}
            isTeacher={isTeacher}
            viewedMaterialIds={viewedMaterialIds}
            searchQuery={searchQuery}
            teacherGroups={teacherGroups}
            t={t}
          />
        )}
        {activeTab === "tasks" && (
          <TasksTab
            group={group}
            isTeacher={isTeacher}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            classification={classification}
            teacherGroups={teacherGroups}
            libraryTasks={libraryTasks}
            trainingTaskIds={trainingTaskIds}
            t={t}
          />
        )}
        {activeTab === "sets" && <SetsTab group={group} isTeacher={isTeacher} t={t} />}
        {activeTab === "submissions" && isTeacher && (
          <SubmissionsTab
            submissions={allSubmissions}
            groupId={group.id}
            reviewFilter={reviewFilter}
            afterId={afterId}
            t={t}
          />
        )}
        {activeTab === "members" && (
          <MembersTab memberships={group.memberships} isTeacher={isTeacher} groupId={group.id} t={t} />
        )}
      </main>
    </>
  );
}

function StudentProgress({
  group,
  viewedMaterialIds,
  t,
}: {
  group: GroupForPage;
  viewedMaterialIds: Set<number>;
  t: TFunction;
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
      <h2 className="font-heading text-[15px] font-semibold text-ink">{t("progress.title")}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
            <span className="text-ink-soft">{t("progress.materials")}</span>
            <span className="font-semibold text-ink">
              {materialsDone}/{materialsTotal}
            </span>
          </div>
          <ProgressBar percent={toPercent(materialsDone, materialsTotal)} />
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
            <span className="text-ink-soft">{t("progress.tasksSolved")}</span>
            <span className="font-semibold text-ink">
              {solvedTasks}/{tasksTotal}
            </span>
          </div>
          <ProgressBar percent={toPercent(solvedTasks, tasksTotal)} />
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
            <span className="text-ink-soft">{t("progress.avgScore")}</span>
            <span className="font-semibold text-ink">
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
  if (tab === "tasks" || tab === "members" || tab === "materials" || tab === "sets") {
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
  t,
}: {
  groupId: number;
  tab: Tab;
  query: string;
  statusFilter?: TaskFilter;
  placeholder: string;
  t: TFunction;
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
          {t("action.find")}
        </Button>
        {query && (
          <LinkButton href={resetHref} variant="secondary" className="shrink-0">
            {t("action.reset")}
          </LinkButton>
        )}
      </div>
    </form>
  );
}

function setClassificationParams(params: URLSearchParams, classification: ClassificationFilters) {
  if (classification.grade !== null) {
    params.set("grade", String(classification.grade));
  }
  if (classification.level !== null) {
    params.set("level", classification.level);
  }
  if (classification.difficulty !== null) {
    params.set("difficulty", String(classification.difficulty));
  }
}

/** Поиск + фильтры классификации на вкладке задач (одна GET-форма). */
function TaskFiltersForm({
  groupId,
  query,
  statusFilter,
  classification,
  t,
}: {
  groupId: number;
  query: string;
  statusFilter?: TaskFilter;
  classification: ClassificationFilters;
  t: TFunction;
}) {
  const keepStatus = statusFilter && statusFilter !== "all" ? statusFilter : null;

  return (
    <form className="grid gap-3" method="get" action={`/groups/${groupId}`} role="search">
      <input type="hidden" name="tab" value="tasks" />
      {keepStatus && <input type="hidden" name="status" value={keepStatus} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          className={inputClasses}
          type="search"
          name="q"
          defaultValue={query}
          placeholder={t("search.tasksPlaceholder")}
          aria-label={t("search.tasksPlaceholder")}
        />
        <SelectField
          label=""
          name="grade"
          defaultValue={classification.grade === null ? "" : String(classification.grade)}
          options={[
            { value: "", label: t("filter.gradeAll") },
            ...taskGrades.map((grade) => ({ value: String(grade), label: `${grade} ${t("filter.gradeSuffix")}` })),
          ]}
        />
        <SelectField
          label=""
          name="level"
          defaultValue={classification.level ?? ""}
          options={[
            { value: "", label: t("filter.levelAll") },
            ...olympiadLevels.map((level) => ({ value: level.value, label: t(enumKey("olympiadLevel", level.value)) })),
          ]}
        />
        <SelectField
          label=""
          name="difficulty"
          defaultValue={classification.difficulty === null ? "" : String(classification.difficulty)}
          options={[
            { value: "", label: t("filter.difficultyAll") },
            ...taskDifficulties.map((level) => ({
              value: String(level),
              label: `${t("filter.difficultyPrefix")} ${level}/5`,
            })),
          ]}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" className="shrink-0">
          {t("action.apply")}
        </Button>
        <LinkButton href={`/groups/${groupId}?tab=tasks`} variant="secondary" className="shrink-0">
          {t("action.reset")}
        </LinkButton>
      </div>
    </form>
  );
}

function TaskFilterChips({
  groupId,
  active,
  query,
  classification,
  t,
}: {
  groupId: number;
  active: TaskFilter;
  query: string;
  classification: ClassificationFilters;
  t: TFunction;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" aria-label={t("filter.aria")}>
      {taskFilters.map((filter) => {
        const isActive = filter.value === active;
        const params = new URLSearchParams({ tab: "tasks" });
        if (filter.value !== "all") {
          params.set("status", filter.value);
        }
        if (query) {
          params.set("q", query);
        }
        setClassificationParams(params, classification);

        return (
          <Link
            key={filter.value}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "border-navy bg-navy text-white"
                : "border-line bg-white text-ink-soft hover:border-ink/25 hover:text-ink"
            }`}
            href={`/groups/${groupId}?${params.toString()}`}
            aria-current={isActive ? "true" : undefined}
          >
            {t(filter.key)}
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
  dotTitle,
}: {
  groupId: number;
  tab: Tab;
  activeTab: Tab;
  label: string;
  showDot?: boolean;
  dotTitle?: string;
}) {
  const isActive = tab === activeTab;

  return (
    <Link
      className={`inline-flex items-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-navy text-white"
          : "border border-line bg-white text-ink-soft hover:border-ink/25 hover:text-ink"
      }`}
      href={`/groups/${groupId}?tab=${tab}`}
      aria-current={isActive ? "page" : undefined}
    >
      {label}
      {showDot && (
        <span
          className="ml-1.5 inline-block h-2 w-2 rounded-full bg-gold"
          title={dotTitle}
        />
      )}
    </Link>
  );
}

/** Форма «Копировать в группу…» — общая для материалов и задач. */
function MaterialsTab({
  group,
  isTeacher,
  viewedMaterialIds,
  searchQuery,
  teacherGroups,
  t,
}: {
  group: GroupForPage;
  isTeacher: boolean;
  viewedMaterialIds: Set<number>;
  searchQuery: string;
  teacherGroups: TeacherGroupOption[];
  t: TFunction;
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
          placeholder={t("search.materialsPlaceholder")}
          t={t}
        />
      )}
      {isTeacher && (
        <details className={cardClasses}>
          <summary className="cursor-pointer font-heading text-[15px] font-semibold text-ink transition-colors hover:text-navy">
            {t("material.add")}
          </summary>
          <form
            className="mt-4 grid gap-4"
            action={`/api/groups/${group.id}/materials`}
            method="post"
            encType="multipart/form-data"
          >
          <TextInput label={t("field.title")} name="title" />
          <TextArea label={t("field.description")} name="description" />
          <MaterialTypeSelect t={t} />
          <TextInput
            label={t("material.url")}
            name="url"
            type="url"
            required={false}
            placeholder={t("material.urlPlaceholder")}
          />
          <FileInput
            label={t("material.file")}
            name="file"
            hint={`${t("material.fileHintPrefix")} ${maxUploadLabel()}`}
          />
            <Button className="w-fit">{t("action.add")}</Button>
          </form>
        </details>
      )}

      {group.materials.length === 0 ? (
        <EmptyState
          title={t("material.emptyTitle")}
          description={isTeacher ? t("material.emptyTeacher") : t("material.emptyStudent")}
        />
      ) : visibleMaterials.length === 0 ? (
        <EmptyState title={t("search.noResults")} description={t("search.noMaterialsDesc")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleMaterials.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              isTeacher={isTeacher}
              viewed={viewedMaterialIds.has(material.id)}
              teacherGroups={teacherGroups}
              t={t}
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
  t,
}: {
  material: Material;
  isTeacher: boolean;
  viewed: boolean;
  teacherGroups: TeacherGroupOption[];
  t: TFunction;
}) {
  const materialTypeBadge =
    material.type === "LINK" || material.type === "TEXT"
      ? t(enumKey("materialType", `${material.type}_badge`))
      : t(enumKey("materialType", material.type));
  // Открытие и скачивание идут через API даже для ссылок (роут редиректит на url):
  // так фиксируется отметка «изучено» для прогресса ученика.
  const openHref = `/api/materials/${material.id}/file?open=1`;
  const downloadHref = `/api/materials/${material.id}/download`;
  // У текстового материала нет ни файла, ни ссылки — кнопки «Открыть/Скачать» не нужны.
  const hasContent = Boolean(material.url ?? material.filePath);

  return (
    <article className={cardClasses}>
      {isPreviewableMaterial(material.type) && material.filePath && (
        <div className="mb-4 h-44 overflow-hidden rounded-lg border border-line bg-paper">
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
        <h3 className="font-semibold text-ink">{material.title}</h3>
        <div className="flex flex-wrap justify-end gap-1.5">
          {!isTeacher && viewed && <Badge tone="green">{t("material.studied")}</Badge>}
          <Badge>{materialTypeBadge}</Badge>
        </div>
      </div>
      <p className="mt-1 text-sm text-ink-soft">{material.description}</p>
      <div className="mt-3 space-y-0.5 text-xs text-ink-mute">
        <p>{t("material.uploadedAt")}: {formatDate(material.uploadedAt)}</p>
        {material.originalFileName && (
          <p className="break-all">{t("material.fileName")}: {material.originalFileName}</p>
        )}
      </div>
      {hasContent && (
        <div className="mt-4 flex flex-wrap gap-2">
          <AnchorButton href={openHref} variant="primary" size="sm" newTab>
            {t("action.open")}
          </AnchorButton>
          <AnchorButton href={downloadHref} variant="secondary" size="sm">
            {t("action.download")}
          </AnchorButton>
        </div>
      )}
      {!isTeacher && !hasContent && !viewed && (
        <form className="mt-4" action={`/api/materials/${material.id}/viewed`} method="post">
          <Button variant="secondary" size="sm">
            {t("material.markStudied")}
          </Button>
        </form>
      )}
      {isTeacher && (
        <details className="mt-4 border-t border-line/70 pt-3">
          <summary className="cursor-pointer text-sm font-medium text-ink-soft hover:text-ink">
            {t("action.edit")}
          </summary>
          <form
            className="mt-4 grid gap-3"
            action={`/api/materials/${material.id}/update`}
            method="post"
            encType="multipart/form-data"
          >
            <TextInput label={t("field.title")} name="title" defaultValue={material.title} />
            <TextArea label={t("field.description")} name="description" defaultValue={material.description} />
            <MaterialTypeSelect defaultValue={material.type} t={t} />
            <TextInput
              label={t("material.url")}
              name="url"
              type="url"
              required={false}
              defaultValue={material.url ?? ""}
              placeholder={t("material.urlPlaceholder")}
            />
            <FileInput label={t("material.newFile")} name="file" />
            <Button className="w-fit">{t("action.save")}</Button>
          </form>
          <form
            className="mt-3"
            action={`/api/materials/${material.id}/delete`}
            method="post"
            data-confirm={t("material.deleteConfirm")}
          >
            <Button variant="danger" size="sm">
              {t("action.delete")}
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

function MaterialTypeSelect({ defaultValue, t }: { defaultValue?: string; t: TFunction }) {
  return (
    <SelectField
      label={t("material.typeLabel")}
      name="type"
      defaultValue={defaultValue ?? "TEXT"}
      options={materialTypes.map((type) => ({ value: type.value, label: t(enumKey("materialType", type.value)) }))}
    />
  );
}

function TasksTab({
  group,
  isTeacher,
  searchQuery,
  statusFilter,
  classification,
  teacherGroups,
  libraryTasks,
  trainingTaskIds,
  t,
}: {
  group: GroupForPage;
  isTeacher: boolean;
  searchQuery: string;
  statusFilter: TaskFilter;
  classification: ClassificationFilters;
  teacherGroups: TeacherGroupOption[];
  libraryTasks: LibraryTask[];
  trainingTaskIds: Set<number>;
  t: TFunction;
}) {
  const normalizedQuery = searchQuery.toLowerCase();
  const visibleTasks = group.tasks.filter((task) => {
    const matchesStatus =
      isTeacher || statusFilter === "all" || getStudentTaskStatus(task) === statusFilter;
    const matchesClassification =
      (classification.grade === null || task.grade === classification.grade) &&
      (classification.level === null || task.olympiadLevel === classification.level) &&
      (classification.difficulty === null || task.difficulty === classification.difficulty);
    return matchesStatus && matchesClassification && matchesSearch(task, normalizedQuery);
  });
  const hasActiveFilter =
    Boolean(searchQuery) ||
    (!isTeacher && statusFilter !== "all") ||
    classification.grade !== null ||
    classification.level !== null ||
    classification.difficulty !== null;

  return (
    <section className="space-y-5">
      {group.tasks.length > 0 && (
        <div className="space-y-3">
          <TaskFiltersForm
            groupId={group.id}
            query={searchQuery}
            statusFilter={isTeacher ? undefined : statusFilter}
            classification={classification}
            t={t}
          />
          {!isTeacher && (
            <TaskFilterChips
              groupId={group.id}
              active={statusFilter}
              query={searchQuery}
              classification={classification}
              t={t}
            />
          )}
        </div>
      )}
      {isTeacher && (
        <details className={cardClasses}>
          <summary className="cursor-pointer text-sm font-medium text-ink-soft hover:text-ink">
            {t("task.library")} ({libraryTasks.length})
          </summary>
          <p className="mt-2 text-xs text-ink-mute">{t("task.libraryDesc")}</p>
          {libraryTasks.length === 0 ? (
            <p className="mt-3 text-sm text-ink-mute">{t("task.libraryEmpty")}</p>
          ) : (
            <ul className="mt-2 divide-y divide-line/70">
              {libraryTasks.map((task) => (
                <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={task.id}>
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{task.title}</p>
                    <p className="mt-0.5 text-xs text-ink-mute">
                      {task.group.name} · {t(enumKey("taskType", task.type))}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <TaskClassificationBadges task={task} />
                    </div>
                  </div>
                  <form action={`/api/tasks/${task.id}/copy`} method="post">
                    <input type="hidden" name="targetGroupId" value={group.id} />
                    <Button variant="secondary" size="sm">
                      {t("action.add")}
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </details>
      )}
      {isTeacher && (
        <details className={cardClasses}>
          <summary className="cursor-pointer font-heading text-[15px] font-semibold text-ink transition-colors hover:text-navy">
            {t("task.create")}
          </summary>
          <form
            className="mt-4 grid gap-4"
            action={`/api/groups/${group.id}/tasks`}
            method="post"
            encType="multipart/form-data"
          >
          <TextInput label={t("field.title")} name="title" />
          <TextArea label={t("task.condition")} name="description" />
          <TaskTypeSelect />
          <TextArea
            label={t("task.options")}
            name="options"
            required={false}
            placeholder={t("task.optionsPlaceholder")}
          />
          <TextInput
            label={t("task.correctAnswer")}
            name="correctAnswer"
            required={false}
            placeholder={t("task.correctAnswerPlaceholder")}
          />
          <TextInput label={t("task.maxScore")} name="maxScore" type="number" min={1} />
          <TaskClassificationFields />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label={t("task.opensAt")} name="opensAt" type="datetime-local" required={false} />
            <TextInput label={t("task.dueAt")} name="dueAt" type="datetime-local" required={false} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <PublishSelect />
            <TextInput label={t("task.publishAt")} name="publishAt" type="datetime-local" required={false} />
          </div>
          <FileInput
            label={t("task.image")}
            name="image"
            accept="image/*"
            hint={`${t("task.imageHintPrefix")} ${maxUploadLabel()}`}
          />
          <MapPointEditor labels={mapEditorLabels(t)} />
            <Button className="w-fit">{t("action.create")}</Button>
          </form>
        </details>
      )}

      {group.tasks.length === 0 ? (
        <EmptyState
          title={t("task.emptyTitle")}
          description={isTeacher ? t("task.emptyTeacher") : t("task.emptyStudent")}
        />
      ) : visibleTasks.length === 0 ? (
        <EmptyState
          title={t("search.noResults")}
          description={hasActiveFilter ? t("search.noTasksFiltered") : t("search.noTasks")}
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
              inTraining={trainingTaskIds.has(task.id)}
              submissionContext={{
                returnTo: `/groups/${group.id}?tab=tasks#task-${task.id}`,
                oneShot: false,
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** Тематические подборки задач группы. */
function SetsTab({ group, isTeacher, t }: { group: GroupForPage; isTeacher: boolean; t: TFunction }) {
  return (
    <section className="space-y-5">
      {isTeacher && (
        <details className={cardClasses}>
          <summary className="cursor-pointer font-heading text-[15px] font-semibold text-ink transition-colors hover:text-navy">
            {t("set.create")}
          </summary>
          <form className="mt-4 grid gap-4" action={`/api/groups/${group.id}/sets`} method="post">
          <TextInput label={t("field.title")} name="title" placeholder={t("set.titlePlaceholder")} />
          <TextArea label={t("field.description")} name="description" placeholder={t("set.descPlaceholder")} />
          <TextInput
            label={t("set.trainingMinutes")}
            name="trainingMinutes"
            type="number"
            min={1}
            max={600}
            required={false}
            placeholder={t("set.trainingPlaceholder")}
          />
            <Button className="w-fit">{t("set.createButton")}</Button>
          </form>
        </details>
      )}

      {group.taskSets.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {group.taskSets.map((set) => (
            <Link
              key={set.id}
              className={`${cardClasses} block transition hover:border-navy/40 hover:shadow-md`}
              href={`/groups/${group.id}/sets/${set.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-ink">{set.title}</h3>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {set.trainingMinutes !== null && (
                    <Badge tone="amber">
                      {t("set.trainingBadge")} · {set.trainingMinutes} {t("set.minShort")}
                    </Badge>
                  )}
                  <Badge tone="emerald">
                    {t("set.tasksBadge")}: {set._count.items}
                  </Badge>
                </div>
              </div>
              <p className="mt-1 text-sm text-ink-soft">{set.description}</p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title={t("set.emptyTitle")}
          description={isTeacher ? t("set.emptyTeacher") : t("set.emptyStudent")}
        />
      )}
    </section>
  );
}

function SubmissionsTab({
  submissions,
  groupId,
  reviewFilter,
  afterId,
  t,
}: {
  submissions: SubmissionForTeacher[];
  groupId: number;
  reviewFilter: ReviewFilter;
  afterId: number | null;
  t: TFunction;
}) {
  if (submissions.length === 0) {
    return <EmptyState title={t("sub.emptyTitle")} description={t("sub.emptyDesc")} />;
  }

  const pendingCount = submissions.filter((submission) => submission.status === "PENDING").length;
  const filterChips = (
    <div className="flex gap-2 overflow-x-auto pb-1" aria-label={t("sub.aria")}>
      {[
        { value: "all" as const, label: `${t("sub.all")} (${submissions.length})` },
        { value: "pending" as const, label: `${t("sub.pending")} (${pendingCount})` },
      ].map((chip) => {
        const isActive = chip.value === reviewFilter;
        return (
          <Link
            key={chip.value}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "border-navy bg-navy text-white"
                : "border-line bg-white text-ink-soft hover:border-ink/25 hover:text-ink"
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
        <ReviewQueue submissions={submissions} groupId={groupId} afterId={afterId} t={t} />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {filterChips}
      {submissions.map((submission) => {
        const isAutoGraded = isAutoCheckedTask(submission.task);

        const reviewForm = (
          <form
            className="mt-4 grid gap-3"
            action={`/api/submissions/${submission.id}/review`}
            method="post"
          >
            <TextInput
              label={`${t("sub.scoreOfPrefix")} ${submission.task.maxScore}`}
              name="score"
              type="number"
              min={0}
              max={submission.task.maxScore}
              defaultValue={submission.review?.score}
            />
            <TextArea label={t("sub.feedback")} name="feedback" defaultValue={submission.review?.feedback} />
            <Button className="w-fit">{t("sub.saveReview")}</Button>
          </form>
        );

        return (
          <article className={cardClasses} key={submission.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-ink">{submission.task.title}</h3>
                <p className="mt-0.5 text-sm text-ink-soft">
                  {submission.student.name} · {t(enumKey("taskType", submission.task.type))}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {isAutoGraded && <Badge tone="emerald">{t("sub.autoCheck")}</Badge>}
                {submission.review && (
                  <Badge tone="emerald">
                    {submission.review.score} / {submission.task.maxScore}
                  </Badge>
                )}
                <Badge tone={submission.status === "REVIEWED" ? "green" : "amber"}>
                  {t(enumKey("status", submission.status))}
                </Badge>
              </div>
            </div>
            {submission.answer && (
              <p className="mt-3 whitespace-pre-wrap rounded-lg bg-paper px-3 py-2 text-sm text-ink">
                {submission.answer}
              </p>
            )}
            {submission.originalFileName && (
              <a
                className="mt-2 inline-block break-all text-sm font-medium text-navy hover:underline"
                href={`/api/submissions/${submission.id}/file`}
              >
                {t("sub.downloadFile")}: {submission.originalFileName}
              </a>
            )}
            {isAutoGraded ? (
              // Балл уже выставлен автоматически — ручная форма спрятана,
              // но остаётся доступной, если учитель хочет скорректировать оценку.
              <details className="mt-4 border-t border-line/70 pt-3">
                <summary className="cursor-pointer text-sm font-medium text-ink-soft hover:text-ink">
                  {t("sub.editManual")}
                </summary>
                {reviewForm}
              </details>
            ) : (
              <div className="mt-4 border-t border-line/70 pt-1">{reviewForm}</div>
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
  t,
}: {
  submissions: SubmissionForTeacher[];
  groupId: number;
  afterId: number | null;
  t: TFunction;
}) {
  const pending = submissions
    .filter((submission) => submission.status === "PENDING")
    .sort((a, b) => a.id - b.id);

  if (pending.length === 0) {
    return <EmptyState title={t("queue.allDone")} description={t("queue.allDoneDesc")} />;
  }

  const queue = afterId === null ? pending : pending.filter((submission) => submission.id > afterId);
  const current = queue[0];

  if (!current) {
    return (
      <div className="space-y-4">
        <EmptyState
          title={t("queue.end")}
          description={`${t("queue.endDescPrefix")} (${pending.length}). ${t("queue.endDescSuffix")}`}
        />
        <div className="text-center">
          <LinkButton href={`/groups/${groupId}?tab=submissions&filter=pending`} variant="primary">
            {t("queue.restart")}
          </LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft">
        {t("queue.remaining")}: <span className="font-semibold text-ink">{queue.length}</span>
      </p>
      <article className={cardClasses}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-ink">{current.task.title}</h3>
            <p className="mt-0.5 text-sm text-ink-soft">
              {current.student.name} · {t(enumKey("taskType", current.task.type))}
            </p>
          </div>
          <Badge tone={current.status === "REVIEWED" ? "green" : "amber"}>
            {t(enumKey("status", current.status))}
          </Badge>
        </div>
        {current.answer && (
          <p className="mt-3 whitespace-pre-wrap rounded-lg bg-paper px-3 py-2 text-sm text-ink">
            {current.answer}
          </p>
        )}
        {current.originalFileName && (
          <a
            className="mt-2 inline-block break-all text-sm font-medium text-navy hover:underline"
            href={`/api/submissions/${current.id}/file`}
          >
            {t("sub.downloadFile")}: {current.originalFileName}
          </a>
        )}
        <form
          className="mt-4 grid gap-3 border-t border-line/70 pt-4"
          action={`/api/submissions/${current.id}/review`}
          method="post"
        >
          <input type="hidden" name="filter" value="pending" />
          <TextInput
            label={`${t("sub.scoreOfPrefix")} ${current.task.maxScore}`}
            name="score"
            type="number"
            min={0}
            max={current.task.maxScore}
          />
          <TextArea label={t("sub.feedback")} name="feedback" />
          <div className="flex flex-wrap gap-2">
            <Button className="w-fit">{t("queue.saveNext")}</Button>
            <LinkButton
              href={`/groups/${groupId}?tab=submissions&filter=pending&after=${current.id}`}
              variant="secondary"
            >
              {t("queue.skip")}
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
  t,
}: {
  memberships: GroupForPage["memberships"];
  isTeacher: boolean;
  groupId: number;
  t: TFunction;
}) {
  if (memberships.length === 0) {
    return (
      <EmptyState
        title={t("member.emptyTitle")}
        description={isTeacher ? t("member.emptyTeacher") : undefined}
      />
    );
  }

  return (
    <section className="space-y-4">
      {isTeacher && (
        <div className="flex justify-end">
          <AnchorButton href={`/api/groups/${groupId}/export`} variant="secondary" size="sm">
            {t("member.export")}
          </AnchorButton>
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-line bg-paper text-left text-xs font-medium uppercase tracking-wide text-ink-mute">
              <th className="px-4 py-3">{t("member.student")}</th>
              <th className="px-4 py-3">{t("member.reviewed")}</th>
              <th className="px-4 py-3">{t("member.totalScore")}</th>
              {isTeacher && <th className="px-4 py-3">{t("member.actions")}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {memberships.map((membership) => {
              const reviewed = membership.user.submissions.filter((submission) => submission.review);
              const totalScore = reviewed.reduce(
                (sum, submission) => sum + (submission.review?.score ?? 0),
                0,
              );

              return (
                <tr key={membership.user.id}>
                  <td className="px-4 py-3 font-medium text-ink">{membership.user.name}</td>
                  <td className="px-4 py-3 text-ink-soft">{reviewed.length}</td>
                  <td className="px-4 py-3 text-ink-soft">{totalScore}</td>
                  {isTeacher && (
                    <td className="px-4 py-3">
                      <form
                        action={`/api/memberships/${membership.id}/delete`}
                        method="post"
                        data-confirm={t("member.removeConfirm")}
                      >
                        <Button variant="danger" size="sm">
                          {t("member.remove")}
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
