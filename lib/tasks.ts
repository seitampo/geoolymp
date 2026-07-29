import { TaskType } from "@prisma/client";

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
 * Частичный балл для MULTIPLE_CHOICE (олимпиадная схема):
 * (верно отмеченные − лишние) / всего верных, не ниже нуля, доля от maxScore.
 * Полный балл достижим только при точном совпадении множеств; из-за округления
 * неполный ответ никогда не получает maxScore (кап maxScore − 1).
 */
export function scoreMultipleChoice(answer: string, correctAnswer: string, maxScore: number) {
  const toSet = (value: string) =>
    new Set(value.split(";").map((part) => part.trim()).filter(Boolean));
  const given = toSet(answer);
  const correct = toSet(correctAnswer);

  let hit = 0;
  for (const value of given) {
    if (correct.has(value)) {
      hit += 1;
    }
  }
  const extra = given.size - hit;
  const exact = extra === 0 && hit === correct.size;

  if (exact) {
    return { score: maxScore, hit, extra, total: correct.size, exact };
  }

  const ratio = Math.max(0, hit - extra) / Math.max(1, correct.size);
  const score = Math.min(maxScore - 1, Math.round(maxScore * ratio));
  return { score: Math.max(0, score), hit, extra, total: correct.size, exact };
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
/**
 * Результат проверки правильного ответа. Возвращаем код ошибки (не готовый текст),
 * чтобы сообщение перевести в роуте через t() — см. i18n этап C.
 */
export type CorrectAnswerError = { code: "required" } | { code: "mismatch"; missing: string[] };

export function validateChoiceCorrectAnswer(
  type: TaskType,
  options: string[],
  correctAnswer: string,
): CorrectAnswerError | null {
  if (!requiresOptions(type)) {
    return null;
  }

  if (!correctAnswer.trim()) {
    return { code: "required" };
  }

  const answers =
    type === TaskType.MULTIPLE_CHOICE
      ? correctAnswer.split(";").map((value) => value.trim()).filter(Boolean)
      : [correctAnswer.trim()];
  const missing = answers.filter((value) => !options.includes(value));

  if (missing.length > 0) {
    return { code: "mismatch", missing };
  }

  return null;
}
