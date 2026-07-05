import { Review, Submission, Task, User } from "@prisma/client";
import { Badge, SubmissionStatusBadge, TaskStatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { cardClasses } from "@/components/Card";
import { FileInput, SelectField, TextArea, TextInput } from "@/components/FormFields";
import { MapAnswerInput, MapPointEditor } from "@/components/MapPoint";
import {
  formatDateTime,
  getOlympiadLevelLabel,
  getTaskTypeLabel,
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

/** Форма «Копировать в группу…» — общая для материалов и задач. */
export function CopyForm({
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

export function TaskTypeSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <SelectField label="Тип задачи" name="type" defaultValue={defaultValue ?? "TEXT"} options={taskTypes} />
  );
}

export function PublishSelect({ defaultValue }: { defaultValue?: string }) {
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

/** Класс, уровень олимпиады и сложность — в формах создания и редактирования задачи. */
export function TaskClassificationFields({ task }: { task?: Task }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <SelectField
        label="Класс"
        name="grade"
        defaultValue={task?.grade ? String(task.grade) : ""}
        options={[
          { value: "", label: "Не указан" },
          ...taskGrades.map((grade) => ({ value: String(grade), label: `${grade} класс` })),
        ]}
      />
      <SelectField
        label="Уровень олимпиады"
        name="olympiadLevel"
        defaultValue={task?.olympiadLevel ?? ""}
        options={[{ value: "", label: "Не указан" }, ...olympiadLevels]}
      />
      <SelectField
        label="Сложность"
        name="difficulty"
        defaultValue={task?.difficulty ? String(task.difficulty) : ""}
        options={[
          { value: "", label: "Не указана" },
          ...taskDifficulties.map((level) => ({ value: String(level), label: `${level} из 5` })),
        ]}
      />
    </div>
  );
}

/** Бейджи классификации — на карточке задачи и в библиотеке. */
export function TaskClassificationBadges({ task }: { task: Task }) {
  return (
    <>
      {task.grade && <Badge>{task.grade} класс</Badge>}
      {task.olympiadLevel && <Badge>{getOlympiadLevelLabel(task.olympiadLevel)}</Badge>}
      {task.difficulty && <Badge>Сложность {task.difficulty}/5</Badge>}
    </>
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

export function TaskCard({
  task,
  isTeacher,
  teacherGroups,
  membersCount,
  inTraining = false,
}: {
  task: TaskWithStudentSubmission;
  isTeacher: boolean;
  teacherGroups: TeacherGroupOption[];
  membersCount: number;
  /** Задача занята в тренировочной подборке — ученикам видна только там. */
  inTraining?: boolean;
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
          {isTeacher && inTraining && <Badge tone="amber">Только в тренировке</Badge>}
          {isTeacher && !visibleToStudents &&
            (task.publishAt ? (
              <Badge tone="amber">Публикация: {formatDateTime(task.publishAt)}</Badge>
            ) : (
              <Badge tone="amber">Черновик</Badge>
            ))}
          <Badge>{getTaskTypeLabel(task.type)}</Badge>
          <TaskClassificationBadges task={task} />
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
      {task.imagePath && !isMapTask(task.type) && (
        <img
          className="mt-3 max-h-80 rounded-lg border border-gray-200 object-contain"
          src={`/api/tasks/${task.id}/image`}
          alt={task.title}
          loading="lazy"
        />
      )}
      {isTeacher && isMapTask(task.type) && task.imagePath &&
        task.mapTargetX !== null && task.mapTargetY !== null && task.mapRadius !== null && (
          <div className="mt-3">
            <p className="mb-2 text-xs text-gray-500">Правильная зона (видна только вам):</p>
            <MapAnswerInput
              imageUrl={`/api/tasks/${task.id}/image`}
              readOnly
              target={{ x: task.mapTargetX, y: task.mapTargetY, radius: task.mapRadius }}
            />
          </div>
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
            <TaskClassificationFields task={task} />
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
            <MapPointEditor
              existingImageUrl={task.imagePath ? `/api/tasks/${task.id}/image` : undefined}
              initialX={task.mapTargetX ?? undefined}
              initialY={task.mapTargetY ?? undefined}
              initialRadius={task.mapRadius ?? undefined}
            />
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

      {isTeacher && <ExplanationEditor task={task} />}

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

/** Форма разбора решения (учитель): текст и/или файл PDF/картинка. */
function ExplanationEditor({ task }: { task: Task }) {
  const hasExplanation = Boolean(task.explanationText || task.explanationFilePath);

  return (
    <details className="mt-4 border-t border-gray-100 pt-3">
      <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900">
        Разбор решения{hasExplanation ? " · добавлен" : ""}
      </summary>
      <p className="mt-2 text-xs text-gray-500">
        Ученик увидит разбор после того, как его решение будет проверено.
      </p>
      <form
        className="mt-3 grid gap-3"
        action={`/api/tasks/${task.id}/explanation`}
        method="post"
        encType="multipart/form-data"
      >
        <TextArea
          label="Текст разбора"
          name="explanationText"
          required={false}
          defaultValue={task.explanationText ?? ""}
          placeholder="Ход решения, типичные ошибки, на что обратить внимание"
        />
        <FileInput
          label={task.explanationFilePath ? "Заменить файл разбора" : "Файл разбора (необязательно)"}
          name="file"
          accept=".pdf,image/*"
          hint={`PDF, JPG, PNG или WebP, до ${maxUploadLabel()}`}
        />
        {task.explanationFilePath && (
          <a
            className="break-all text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
            href={`/api/tasks/${task.id}/explanation/file`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Текущий файл: {task.explanationFileName ?? "открыть"}
          </a>
        )}
        <Button className="w-fit">Сохранить разбор</Button>
      </form>
      {hasExplanation && (
        <form className="mt-3" action={`/api/tasks/${task.id}/explanation/delete`} method="post">
          <Button variant="danger" size="sm">
            Удалить разбор
          </Button>
        </form>
      )}
    </details>
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
            <p className="mt-1.5 text-xs text-gray-500">
              Красная метка — ваш ответ{isReviewed ? ", зелёная зона — правильная область" : ""}.
            </p>
          </div>
        ) : (
          submission.answer && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{submission.answer}</p>
          )
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

      {isReviewed && (task.explanationText || task.explanationFilePath) && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-900">Разбор задачи</p>
          {task.explanationText && (
            <p className="mt-1.5 whitespace-pre-wrap text-sm text-emerald-900">{task.explanationText}</p>
          )}
          {task.explanationFilePath && (
            <a
              className="mt-2 inline-block break-all text-sm font-medium text-emerald-800 hover:underline"
              href={`/api/tasks/${task.id}/explanation/file`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Открыть файл разбора{task.explanationFileName ? ` (${task.explanationFileName})` : ""}
            </a>
          )}
        </div>
      )}

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
      {task.type === "MAP_POINT" && task.imagePath && (
        <MapAnswerInput imageUrl={`/api/tasks/${task.id}/image`} initialAnswer={submission?.answer} />
      )}
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
      <p className="text-xs text-gray-500">
        Ответ засчитывается только после нажатия «Отправить». Каждую задачу нужно отправить отдельно.
      </p>
      <Button className="w-fit">Отправить</Button>
    </form>
  );
}
