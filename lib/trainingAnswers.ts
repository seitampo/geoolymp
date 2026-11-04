import type { TaskType } from "@prisma/client";
import {
  normalizeMultipleChoiceAnswer,
  parseMapPoint,
  parseTaskOptions,
} from "./tasks";

export function validateTrainingAnswer(
  task: { type: TaskType; options: string | null },
  value: string,
):
  | { answer: string }
  | {
      error:
        | "err.selectAnswerOption"
        | "err.mapPointStudent"
        | "err.enterAnswer";
    } {
  const answer = value.trim();
  if (!answer) return { answer: "" };
  if (answer.length > 50_000) return { error: "err.enterAnswer" };
  if (
    task.type === "SINGLE_CHOICE" &&
    !parseTaskOptions(task.options).includes(answer)
  )
    return { error: "err.selectAnswerOption" };
  if (task.type === "MULTIPLE_CHOICE") {
    const choices = answer
      .split(";")
      .map((value) => value.trim())
      .filter(Boolean);
    if (
      !choices.length ||
      choices.some((choice) => !parseTaskOptions(task.options).includes(choice))
    )
      return { error: "err.selectAnswerOption" };
    return { answer: normalizeMultipleChoiceAnswer([...new Set(choices)]) };
  }
  if (task.type === "MAP_POINT" && !parseMapPoint(answer))
    return { error: "err.mapPointStudent" };
  return { answer };
}
