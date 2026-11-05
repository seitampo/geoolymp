import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/** The same visibility rule is used by lists and direct task endpoints. */
export function publishedTaskWhere(now = new Date()): Prisma.TaskWhereInput {
  return {
    AND: [
      { OR: [{ isPublished: true }, { publishAt: { lte: now } }] },
      {
        OR: [
          { setItems: { none: {} } },
          { setItems: { some: { set: { isPublished: true } } } },
        ],
      },
    ],
  };
}

export async function isTaskIssued(taskId: number) {
  return (
    (await prisma.task.count({
      where: { id: taskId, ...publishedTaskWhere() },
    })) > 0
  );
}

export async function isMaterialIssued(materialId: number) {
  return (
    (await prisma.material.count({
      where: { id: materialId, isPublished: true },
    })) > 0
  );
}
