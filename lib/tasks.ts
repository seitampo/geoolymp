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
