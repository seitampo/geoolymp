import { TaskType } from "@prisma/client";

export const taskTypes = [
  { value: TaskType.TEXT, label: "Текстовый ответ" },
  { value: TaskType.SINGLE_CHOICE, label: "Один вариант" },
  { value: TaskType.MULTIPLE_CHOICE, label: "Несколько вариантов" },
  { value: TaskType.IMAGE_UPLOAD, label: "Загрузка изображения" },
  { value: TaskType.FILE_UPLOAD, label: "Загрузка файла" },
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

/** Задачи с вариантами проверяются автоматически, остальные — учителем вручную. */
export function isAutoGradedTask(type: TaskType) {
  return type === TaskType.SINGLE_CHOICE || type === TaskType.MULTIPLE_CHOICE;
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
