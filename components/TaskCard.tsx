import { Review, Submission, Task, User } from "@prisma/client";
import { Badge, SubmissionStatusBadge, TaskStatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { cardClasses } from "@/components/Card";
import { FileInput, SelectField, TextArea, TextInput } from "@/components/FormFields";
import { MapAnswerInput, MapPointEditor } from "@/components/MapPoint";
import { getT, type TFunction, type TranslationKey } from "@/lib/i18n";
import {
  formatDateTime,
  isAutoGradedTask,
  isMapTask,
  isTaskNotYetOpen,
  isTaskOverdue,
  isTaskVisibleToStudents,
  olympiadLevels,
  parseTaskOptions,
  taskDifficulties,
  taskGrades,
  taskTypes,
  toDateTimeLocalValue,
} from "@/lib/tasks";
import { maxUploadLabel } from "@/lib/uploads";

export type TaskWithStudentSubmission = Task & {
  submissions: (Submission & {
    review: Review | null;
    student: User;
  })[];
};

export type TeacherGroupOption = { id: number; name: string };

/** Ключ перевода для значения enum (тип задачи, уровень олимпиады). */
function enumKey(prefix: string, value: string): TranslationKey {
  return `${prefix}.${value}` as TranslationKey;
}

/** Форма «Копировать в группу…» — общая для материалов и задач. */
export async function CopyForm({
  action,
  teacherGroups,
  currentGroupId,
}: {
  action: string;
  teacherGroups: TeacherGroupOption[];
  currentGroupId: number;
}) {
  const t = await getT();
  return (
    <form className="mt-4 flex flex-col gap-2 border-t border-line/70 pt-3 sm:flex-row sm:items-end" action={action} method="post">
      <div className="flex-1">
        <SelectField
          label={t("copy.toGroup")}
          name="targetGroupId"
          defaultValue={String(currentGroupId)}
          options={teacherGroups.map((option) => ({
            value: String(option.id),
            label: option.id === currentGroupId ? `${option.name} (${t("copy.thisGroup")})` : option.name,
          }))}
        />
      </div>
      <Button variant="secondary" className="shrink-0">
        {t("copy.button")}
      </Button>
    </form>
  );
}

export async function TaskTypeSelect({ defaultValue }: { defaultValue?: string }) {
  const t = await getT();
  return (
    <SelectField
      label={t("taskForm.typeLabel")}
      name="type"
      defaultValue={defaultValue ?? "TEXT"}
      options={taskTypes.map((type) => ({ value: type.value, label: t(enumKey("taskType", type.value)) }))}
    />
  );
}

export async function PublishSelect({ defaultValue }: { defaultValue?: string }) {
  const t = await getT();
  return (
    <SelectField
      label={t("taskForm.publishStatus")}
      name="published"
      defaultValue={defaultValue ?? "published"}
      options={[
        { value: "published", label: t("taskForm.published") },
        { value: "draft", label: t("taskForm.draft") },
      ]}
    />
  );
}

/** Класс, уровень олимпиады и сложность — в формах создания и редактирования задачи. */
export async function TaskClassificationFields({ task }: { task?: Task }) {
  const t = await getT();
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <SelectField
        label={t("taskForm.grade")}
        name="grade"
        defaultValue={task?.grade ? String(task.grade) : ""}
        options={[
          { value: "", label: t("taskForm.notSetM") },
          ...taskGrades.map((grade) => ({ value: String(grade), label: `${grade} ${t("filter.gradeSuffix")}` })),
        ]}
      />
      <SelectField
        label={t("taskForm.level")}
        name="olympiadLevel"
        defaultValue={task?.olympiadLevel ?? ""}
        options={[
          { value: "", label: t("taskForm.notSetM") },
          ...olympiadLevels.map((level) => ({ value: level.value, label: t(enumKey("olympiadLevel", level.value)) })),
        ]}
      />
      <SelectField
        label={t("taskForm.difficulty")}
        name="difficulty"
        defaultValue={task?.difficulty ? String(task.difficulty) : ""}
        options={[
          { value: "", label: t("taskForm.notSetF") },
          ...taskDifficulties.map((level) => ({ value: String(level), label: `${level} ${t("taskForm.of5")}` })),
        ]}
      />
    </div>
  );
}

/** Бейджи классификации — на карточке задачи и в библиотеке. */
export async function TaskClassificationBadges({ task }: { task: Task }) {
  const t = await getT();
  return (
    <>
      {task.grade && <Badge>{task.grade} {t("filter.gradeSuffix")}</Badge>}
      {task.olympiadLevel && <Badge>{t(enumKey("olympiadLevel", task.olympiadLevel))}</Badge>}
      {task.difficulty && <Badge>{t("filter.difficultyPrefix")} {task.difficulty}/5</Badge>}
    </>
  );
}

/** Статистика по задаче для учителя: сдачи, средний балл, частота вариантов. */
async function TaskStats({
  task,
  options,
  membersCount,
}: {
  task: TaskWithStudentSubmission;
  options: string[];
  membersCount: number;
}) {
  const t = await getT();
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
    <div className="mt-4 rounded-lg bg-paper px-4 py-3 text-sm">
      <p className="text-ink-soft">
        {t("stats.submitted")}: <span className="font-semibold text-ink">{submitted} {t("stats.of")} {membersCount}</span>
        {" · "}{t("stats.avgScore")}:{" "}
        <span className="font-semibold text-ink">
          {averageScore === null ? "—" : `${formatScore(averageScore)} ${t("stats.of")} ${task.maxScore}`}
        </span>
      </p>
      {optionStats.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {optionStats.map(({ option, count, isCorrect }) => (
            <div className="flex items-center gap-2" key={option}>
              <span className={`w-40 shrink-0 truncate text-xs ${isCorrect ? "font-medium text-green-800" : "text-ink-soft"}`}>
                {isCorrect ? "✓ " : ""}
                {option}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
                <div
                  className={`h-full rounded-full ${isCorrect ? "bg-green-600" : "bg-ink/30"}`}
                  style={{ width: submitted > 0 ? `${(count / submitted) * 100}%` : "0%" }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-xs text-ink-soft">{count}</span>
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

/** Контекст решения на странице подборки: куда вернуться и режим «один ответ». */
export type SubmissionContext = { returnTo: string; oneShot: boolean };

export async function TaskCard({
  task,
  isTeacher,
  teacherGroups,
  membersCount,
  inTraining = false,
  submissionContext,
}: {
  task: TaskWithStudentSubmission;
  isTeacher: boolean;
  teacherGroups: TeacherGroupOption[];
  membersCount: number;
  /** Задача занята в тренировочной подборке — ученикам видна только там. */
  inTraining?: boolean;
  /** Задан на странице подборки — возврат туда и запрет переотправки (контест). */
  submissionContext?: SubmissionContext;
}) {
  const t = await getT();
  const submission = task.submissions[0];
  const options = parseTaskOptions(task.options);
  const notYetOpen = isTaskNotYetOpen(task);
  const overdue = isTaskOverdue(task);
  const hasNewResult = !isTeacher && submission?.review != null && submission.review.seenByStudentAt === null;
  const visibleToStudents = isTaskVisibleToStudents(task);

  return (
    <article id={`task-${task.id}`} className={`${cardClasses} scroll-mt-20`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold text-ink">{task.title}</h3>
        <div className="flex flex-wrap gap-1.5">
          {hasNewResult && <Badge tone="emerald">{t("taskCard.newResult")}</Badge>}
          {!isTeacher && <TaskStatusBadge status={submission?.status ?? null} overdue={overdue} />}
          {isTeacher && inTraining && <Badge tone="amber">{t("taskCard.onlyTraining")}</Badge>}
          {isTeacher && !visibleToStudents &&
            (task.publishAt ? (
              <Badge tone="amber">{t("taskCard.publishAt")}: {formatDateTime(task.publishAt)}</Badge>
            ) : (
              <Badge tone="amber">{t("taskCard.draft")}</Badge>
            ))}
          <Badge>{t(enumKey("taskType", task.type))}</Badge>
          <TaskClassificationBadges task={task} />
          <Badge tone="emerald">{t("taskCard.maxScore")}: {task.maxScore}</Badge>
        </div>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">{task.description}</p>
      {(task.opensAt || task.dueAt) && (
        <p className="mt-2 text-xs text-ink-mute">
          {task.opensAt && <>{t("taskCard.opensLabel")}: {formatDateTime(task.opensAt)}</>}
          {task.opensAt && task.dueAt && " · "}
          {task.dueAt && <>{t("taskCard.dueLabel")}: {formatDateTime(task.dueAt)}</>}
        </p>
      )}
      {task.imagePath && !isMapTask(task.type) && (
        <img
          className="mt-3 max-h-80 rounded-lg border border-line object-contain"
          src={`/api/tasks/${task.id}/image`}
          alt={task.title}
          loading="lazy"
        />
      )}
      {isTeacher && isMapTask(task.type) && task.imagePath &&
        task.mapTargetX !== null && task.mapTargetY !== null && task.mapRadius !== null && (
          <div className="mt-3">
            <p className="mb-2 text-xs text-ink-mute">{t("taskCard.correctZone")}</p>
            <MapAnswerInput
              imageUrl={`/api/tasks/${task.id}/image`}
              readOnly
              target={{ x: task.mapTargetX, y: task.mapTargetY, radius: task.mapRadius }}
            />
          </div>
        )}
      {isTeacher && task.correctAnswer && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          {t("taskCard.correctAnswer")}: {task.correctAnswer}
        </p>
      )}

      {isTeacher && <TaskStats task={task} options={options} membersCount={membersCount} />}

      {isTeacher && (
        <details className="mt-4 border-t border-line/70 pt-3">
          <summary className="cursor-pointer text-sm font-medium text-ink-soft hover:text-ink">
            {t("taskCard.editTask")}
          </summary>
          <form
            className="mt-4 grid gap-3"
            action={`/api/tasks/${task.id}/update`}
            method="post"
            encType="multipart/form-data"
          >
            <TextInput label={t("field.title")} name="title" defaultValue={task.title} />
            <TextArea label={t("task.condition")} name="description" defaultValue={task.description} />
            <TaskTypeSelect defaultValue={task.type} />
            <TextArea
              label={t("task.options")}
              name="options"
              required={false}
              defaultValue={task.options ?? ""}
              placeholder={t("task.optionsPlaceholder")}
            />
            <TextInput
              label={t("task.correctAnswer")}
              name="correctAnswer"
              required={false}
              defaultValue={task.correctAnswer ?? ""}
              placeholder={t("task.correctAnswerPlaceholder")}
            />
            <TextInput label={t("task.maxScore")} name="maxScore" type="number" min={1} defaultValue={task.maxScore} />
            <TaskClassificationFields task={task} />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput
                label={t("task.opensAt")}
                name="opensAt"
                type="datetime-local"
                required={false}
                defaultValue={toDateTimeLocalValue(task.opensAt)}
              />
              <TextInput
                label={t("task.dueAt")}
                name="dueAt"
                type="datetime-local"
                required={false}
                defaultValue={toDateTimeLocalValue(task.dueAt)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <PublishSelect defaultValue={task.isPublished ? "published" : "draft"} />
              <TextInput
                label={t("task.publishAt")}
                name="publishAt"
                type="datetime-local"
                required={false}
                defaultValue={toDateTimeLocalValue(task.publishAt)}
              />
            </div>
            <FileInput label={t("taskCard.newImage")} name="image" accept="image/*" />
            <MapPointEditor
              existingImageUrl={task.imagePath ? `/api/tasks/${task.id}/image` : undefined}
              initialX={task.mapTargetX ?? undefined}
              initialY={task.mapTargetY ?? undefined}
              initialRadius={task.mapRadius ?? undefined}
            />
            <Button className="w-fit">{t("action.save")}</Button>
          </form>
          <form
            className="mt-3"
            action={`/api/tasks/${task.id}/delete`}
            method="post"
            data-confirm={t("taskCard.deleteTaskConfirm")}
          >
            <Button variant="danger" size="sm">
              {t("taskCard.deleteTask")}
            </Button>
          </form>
          <CopyForm
            action={`/api/tasks/${task.id}/copy`}
            teacherGroups={teacherGroups}
            currentGroupId={task.groupId}
          />
        </details>
      )}

      {isTeacher && <ExplanationEditor task={task} />}

      {!isTeacher && (
        <div className="mt-4">
          {notYetOpen ? (
            <p className="rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink-soft">
              {t("student.notYetOpenPrefix")} {formatDateTime(task.opensAt!)} {t("student.notYetOpenSuffix")}
            </p>
          ) : submission ? (
            <StudentSubmissionBlock
              task={task}
              submission={submission}
              options={options}
              canResubmit={!overdue && !submissionContext?.oneShot}
              submissionContext={submissionContext}
            />
          ) : overdue ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {t("student.overduePrefix")} {formatDateTime(task.dueAt!)} {t("student.overdueSuffix")}
            </p>
          ) : (
            <SubmissionForm task={task} options={options} submissionContext={submissionContext} />
          )}
        </div>
      )}
    </article>
  );
}

/** Форма разбора решения (учитель): текст и/или файл PDF/картинка. */
async function ExplanationEditor({ task }: { task: Task }) {
  const t = await getT();
  const hasExplanation = Boolean(task.explanationText || task.explanationFilePath);

  return (
    <details className="mt-4 border-t border-line/70 pt-3">
      <summary className="cursor-pointer text-sm font-medium text-ink-soft hover:text-ink">
        {t("explanation.summary")}{hasExplanation ? ` · ${t("explanation.added")}` : ""}
      </summary>
      <p className="mt-2 text-xs text-ink-mute">{t("explanation.hint")}</p>
      <form
        className="mt-3 grid gap-3"
        action={`/api/tasks/${task.id}/explanation`}
        method="post"
        encType="multipart/form-data"
      >
        <TextArea
          label={t("explanation.text")}
          name="explanationText"
          required={false}
          defaultValue={task.explanationText ?? ""}
          placeholder={t("explanation.textPlaceholder")}
        />
        <FileInput
          label={task.explanationFilePath ? t("explanation.replaceFile") : t("explanation.file")}
          name="file"
          accept=".pdf,image/*"
          hint={`${t("explanation.fileHintPrefix")} ${maxUploadLabel()}`}
        />
        {task.explanationFilePath && (
          <a
            className="break-all text-sm font-medium text-sea hover:underline"
            href={`/api/tasks/${task.id}/explanation/file`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("explanation.currentFile")}: {task.explanationFileName ?? t("explanation.openShort")}
          </a>
        )}
        <Button className="w-fit">{t("explanation.save")}</Button>
      </form>
      {hasExplanation && (
        <form
          className="mt-3"
          action={`/api/tasks/${task.id}/explanation/delete`}
          method="post"
          data-confirm={t("explanation.deleteConfirm")}
        >
          <Button variant="danger" size="sm">
            {t("explanation.delete")}
          </Button>
        </form>
      )}
    </details>
  );
}

async function StudentSubmissionBlock({
  task,
  submission,
  options,
  canResubmit,
  submissionContext,
}: {
  task: Task;
  submission: Submission & { review: Review | null; student: User };
  options: string[];
  canResubmit: boolean;
  submissionContext?: SubmissionContext;
}) {
  const t = await getT();
  const isReviewed = submission.status === "REVIEWED";

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-line bg-paper p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">{t("student.yourAnswer")}</p>
          <SubmissionStatusBadge status={submission.status} />
        </div>

        {isMapTask(task.type) && task.imagePath ? (
          <div className="mt-3">
            <MapAnswerInput
              imageUrl={`/api/tasks/${task.id}/image`}
              initialAnswer={submission.answer || undefined}
              readOnly
              target={
                isReviewed &&
                task.mapTargetX !== null &&
                task.mapTargetY !== null &&
                task.mapRadius !== null
                  ? { x: task.mapTargetX, y: task.mapTargetY, radius: task.mapRadius }
                  : undefined
              }
            />
            <p className="mt-1.5 text-xs text-ink-mute">
              {t("student.mapHintYour")}{isReviewed ? t("student.mapHintCorrect") : ""}.
            </p>
          </div>
        ) : (
          submission.answer && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">{submission.answer}</p>
          )
        )}
        {submission.originalFileName && (
          <a
            className="mt-2 inline-block break-all text-sm font-medium text-sea hover:underline"
            href={`/api/submissions/${submission.id}/file`}
          >
            {submission.originalFileName}
          </a>
        )}

        {isReviewed ? (
          <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm text-ink-soft">
            <p>
              {t("student.score")}:{" "}
              <span className="font-semibold text-ink">
                {submission.review?.score ?? t("student.none")} {t("stats.of")} {task.maxScore}
              </span>
            </p>
            <p>{t("student.comment")}: {submission.review?.feedback || t("student.none")}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-mute">{t("student.notChecked")}</p>
        )}
      </div>

      {isReviewed && (task.explanationText || task.explanationFilePath) && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-900">{t("student.explanationTitle")}</p>
          {task.explanationText && (
            <p className="mt-1.5 whitespace-pre-wrap text-sm text-green-900">{task.explanationText}</p>
          )}
          {task.explanationFilePath && (
            <a
              className="mt-2 inline-block break-all text-sm font-medium text-sea hover:underline"
              href={`/api/tasks/${task.id}/explanation/file`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("student.openExplanation")}{task.explanationFileName ? ` (${task.explanationFileName})` : ""}
            </a>
          )}
        </div>
      )}

      {submissionContext?.oneShot ? (
        <p className="text-xs text-ink-mute">{t("student.oneShot")}</p>
      ) : canResubmit ? (
        <details className="rounded-lg border border-line p-4">
          <summary className="cursor-pointer text-sm font-medium text-ink-soft hover:text-ink">
            {t("student.resubmit")}
          </summary>
          <div className="mt-3">
            <SubmissionForm task={task} options={options} submission={submission} submissionContext={submissionContext} />
          </div>
        </details>
      ) : (
        <p className="text-xs text-ink-mute">{t("student.cantResubmit")}</p>
      )}
    </div>
  );
}

async function SubmissionForm({
  task,
  options,
  submission,
  submissionContext,
}: {
  task: Task;
  options: string[];
  submission?: Submission;
  submissionContext?: SubmissionContext;
}) {
  const t = await getT();
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
      {submissionContext && (
        <input type="hidden" name="returnTo" value={submissionContext.returnTo} />
      )}
      {submissionContext?.oneShot && <input type="hidden" name="once" value="1" />}
      {task.type === "TEXT" && <TextArea label={t("answerForm.answer")} name="answer" defaultValue={submission?.answer ?? ""} />}
      {task.type === "MAP_POINT" && task.imagePath && (
        <MapAnswerInput imageUrl={`/api/tasks/${task.id}/image`} initialAnswer={submission?.answer} />
      )}
      {task.type === "SINGLE_CHOICE" &&
        options.map((option) => (
          <label
            className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink transition-colors hover:border-rust/40"
            key={option}
          >
            <input
              className="h-4 w-4 accent-rust"
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
            className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink transition-colors hover:border-rust/40"
            key={option}
          >
            <input
              className="h-4 w-4 accent-rust"
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
          label={t("answerForm.image")}
          name="file"
          accept="image/*"
          required={!submission?.filePath}
          hint={`${t("answerForm.fileHintImg")} ${maxUploadLabel()}`}
        />
      )}
      {task.type === "FILE_UPLOAD" && (
        <FileInput label={t("answerForm.file")} name="file" required={!submission?.filePath} hint={`${t("answerForm.fileHintAny")} ${maxUploadLabel()}`} />
      )}
      {(task.type === "IMAGE_UPLOAD" || task.type === "FILE_UPLOAD") && (
        <TextArea label={t("answerForm.fileComment")} name="answer" required={false} defaultValue={submission?.answer ?? ""} />
      )}
      <p className="text-xs text-ink-mute">{t("answerForm.hint")}</p>
      <Button className="w-fit">{t("answerForm.submit")}</Button>
    </form>
  );
}
