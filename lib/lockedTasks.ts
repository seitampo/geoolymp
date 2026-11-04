import type { Prisma } from "@prisma/client";

/** Uses the same set locks as starting an attempt, including under concurrent edits. */
export async function taskHasStartedAttempts(
  tx: Prisma.TransactionClient,
  taskId: number,
) {
  await tx.$queryRaw`SELECT s.id FROM "TaskSet" s JOIN "TaskSetItem" i ON i."setId" = s.id WHERE i."taskId" = ${taskId} ORDER BY s.id FOR UPDATE OF s`;
  return (
    (await tx.trainingAttempt.count({
      where: { set: { items: { some: { taskId } } } },
    })) > 0
  );
}
