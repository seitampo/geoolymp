import { OlympiadLevel, TaskType } from "@prisma/client";

export const taskTypes = [
  { value: TaskType.TEXT, label: "Текстовый ответ" },
  { value: TaskType.SINGLE_CHOICE, label: "Один вариант" },
  { value: TaskType.MULTIPLE_CHOICE, label: "Несколько вариантов" },
  { value: TaskType.IMAGE_UPLOAD, label: "Загрузка изображения" },
  { value: TaskType.FILE_UPLOAD, label: "Загрузка файла" },
  { value: TaskType.MAP_POINT, label: "Клик по карте" },
];

export function getTaskTypeLabel(type: TaskType) {
  return taskTypes.find((item) => item.value === type)?.label ?? type;
}

// Классификация задач: класс, уровень олимпиады, сложность.
export const taskGrades = [7, 8, 9, 10, 11];
export const taskDifficulties = [1, 2, 3, 4, 5];

export const olympiadLevels = [
  { value: OlympiadLevel.SCHOOL, label: "Школьная" },
  { value: OlympiadLevel.REGIONAL, label: "Областная" },
  { value: OlympiadLevel.REPUBLICAN, label: "Республиканская" },
  { value: OlympiadLevel.INTERNATIONAL, label: "Международная" },
];

export function getOlympiadLevelLabel(level: OlympiadLevel) {
  return olympiadLevels.find((item) => item.value === level)?.label ?? level;
}

export function validateOlympiadLevel(value: string): OlympiadLevel | null {
  return olympiadLevels.some((item) => item.value === value) ? (value as OlympiadLevel) : null;
}

/**
 * Разбор необязательного числового поля классификации из формы.
 * Пустая строка → null (не указано), значение вне списка → undefined (ошибка формы).
 */
export function parseClassificationNumber(value: string, allowed: number[]): number | null | undefined {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return allowed.includes(parsed) ? parsed : undefined;
}

export function validateTaskType(value: string): TaskType | null {
  return taskTypes.some((item) => item.value === value) ? (value as TaskType) : null;
}

export function requiresOptions(type: TaskType) {
  return type === TaskType.SINGLE_CHOICE || type === TaskType.MULTIPLE_CHOICE;
}

export function parseTaskOptions(options: string | null) {
  if (!options) {
    return [];
  }

  return options
    .split("\n")
    .map((option) => option.trim())
    .filter(Boolean);
}

export function normalizeMultipleChoiceAnswer(values: string[]) {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .join("; ");
}

/**
 * Видна ли задача ученикам: опубликована вручную либо наступило запланированное
 * время публикации. Время проверяется на сервере при каждой отдаче — черновик
 * с датой публикации становится доступен автоматически, без фоновых задач.
 */
export function isTaskVisibleToStudents(
  task: { isPublished: boolean; publishAt: Date | null },
  now = new Date(),
) {
  return task.isPublished || (task.publishAt !== null && task.publishAt <= now);
}

/** Задача ещё не открыта: видна, но отправка решений недоступна. */
export function isTaskNotYetOpen(task: { opensAt: Date | null }, now = new Date()) {
  return task.opensAt !== null && now < task.opensAt;
}

/** Срок сдачи истёк: отправка и изменение решений блокируются. */
export function isTaskOverdue(task: { dueAt: Date | null }, now = new Date()) {
  return task.dueAt !== null && now > task.dueAt;
}

/**
 * Разбор необязательной даты из input[type=datetime-local].
 * Пустая строка → null (без дедлайна), нечитаемое значение → undefined (ошибка формы).
 */
export function parseOptionalDeadline(value: string): Date | null | undefined {
  if (!value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Значение для defaultValue у input[type=datetime-local] (локальное время, без секунд). */
export function toDateTimeLocalValue(date: Date | null) {
  if (!date) {
    return "";
  }

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(date);
}

/** Задачи с вариантами проверяются автоматически, остальные — учителем вручную. */
export function isAutoGradedTask(type: TaskType) {
  return type === TaskType.SINGLE_CHOICE || type === TaskType.MULTIPLE_CHOICE;
}

export function isMapTask(type: TaskType) {
  return type === TaskType.MAP_POINT;
}

/** Поля задачи, которые нужны для автопроверки любого поддерживаемого типа. */
export type AutoCheckableTask = {
  type: TaskType;
  correctAnswer: string | null;
  mapTargetX: number | null;
  mapTargetY: number | null;
  mapRadius: number | null;
};

/** Есть ли у задачи всё для автопроверки (варианты с ответом или карта с целью). */
export function isAutoCheckedTask(task: AutoCheckableTask) {
  if (isAutoGradedTask(task.type)) {
    return Boolean(task.correctAnswer);
  }

  if (isMapTask(task.type)) {
    return task.mapTargetX !== null && task.mapTargetY !== null && task.mapRadius !== null;
  }

  return false;
}

/** Ответ картозадачи: "x;y" в процентах ширины изображения. */
export function parseMapPoint(answer: string): { x: number; y: number } | null {
  const parts = answer.split(";").map((value) => Number(value.trim()));

  if (parts.length !== 2 || parts.some((value) => !Number.isFinite(value))) {
    return null;
  }

  return { x: parts[0], y: parts[1] };
}

/**
 * Число из формы картозадачи (координата/радиус в процентах ширины).
 * Пустая строка → null, вне диапазона → undefined (ошибка формы).
 */
export function parseMapNumber(value: string, min: number, max: number): number | null | undefined {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max
    ? Math.round(parsed * 100) / 100
    : undefined;
}

/**
 * Единая автопроверка для всех поверхностей (задачи, тренировки, олимпиады):
 * true/false — вердикт, null — тип без автопроверки, оценивает учитель.
 */
export function autoCheckAnswer(task: AutoCheckableTask, answer: string): boolean | null {
  if (isAutoGradedTask(task.type) && task.correctAnswer) {
    return isAnswerCorrect(task.type, answer, task.correctAnswer);
  }

  if (isMapTask(task.type) && task.mapTargetX !== null && task.mapTargetY !== null && task.mapRadius !== null) {
    const point = parseMapPoint(answer);

    if (!point) {
      return false;
    }

    // Обе координаты в процентах ширины — обычное евклидово расстояние корректно.
    return Math.hypot(point.x - task.mapTargetX, point.y - task.mapTargetY) <= task.mapRadius;
  }

  return null;
}

/**
 * Сравнение ответа ученика с правильным. Для MULTIPLE_CHOICE обе стороны
 * нормализуются как множества (сортировка, обрезка пробелов) — порядок не важен.
 */
export function isAnswerCorrect(type: TaskType, answer: string, correctAnswer: string) {
  if (type === TaskType.MULTIPLE_CHOICE) {
    return (
      normalizeMultipleChoiceAnswer(answer.split(";")) ===
      normalizeMultipleChoiceAnswer(correctAnswer.split(";"))
    );
  }

  return answer.trim() === correctAnswer.trim();
}

/**
 * Для задач с вариантами правильный ответ обязателен (по нему работает автопроверка)
 * и должен дословно совпадать с вариантами. Возвращает текст ошибки или null.
 */
export function validateChoiceCorrectAnswer(
  type: TaskType,
  options: string[],
  correctAnswer: string,
): string | null {
  if (!requiresOptions(type)) {
    return null;
  }

  if (!correctAnswer.trim()) {
    return "Для задачи с вариантами укажите правильный ответ — по нему работает автопроверка.";
  }

  const answers =
    type === TaskType.MULTIPLE_CHOICE
      ? correctAnswer.split(";").map((value) => value.trim()).filter(Boolean)
      : [correctAnswer.trim()];
  const missing = answers.filter((value) => !options.includes(value));

  if (missing.length > 0) {
    return `Правильный ответ должен дословно совпадать с вариантами. Нет в списке: ${missing.join(", ")}.`;
  }

  return null;
}
