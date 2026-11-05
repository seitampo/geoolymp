import { createHash } from "node:crypto";
import type { Task } from "@prisma/client";

export function taskFingerprint(
  task: Pick<
    Task,
    | "title"
    | "description"
    | "type"
    | "maxScore"
    | "options"
    | "correctAnswer"
    | "originalImageName"
    | "mapTargetX"
    | "mapTargetY"
    | "mapRadius"
  >,
) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        task.title,
        task.description,
        task.type,
        task.maxScore,
        task.options,
        task.correctAnswer,
        task.originalImageName,
        task.mapTargetX,
        task.mapTargetY,
        task.mapRadius,
      ]),
    )
    .digest("hex");
}
