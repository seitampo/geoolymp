import { prisma } from "./prisma";
import { prepareLessonTaskCopy } from "./copyLessonTask";
import { deleteUploadedFile } from "./uploads";
import { taskFingerprint } from "./taskFingerprint";
import { isTrainingSupportedTaskType } from "./training";

export async function addLessonCopies(
  setId: number,
  teacherId: number,
  sourceIds: number[],
) {
  const lesson = await prisma.taskSet.findFirst({
    where: { id: setId, group: { teacherId } },
    include: { _count: { select: { attempts: true } } },
  });
  if (!lesson) return { error: "lesson.notFound" as const };
  if (lesson._count.attempts) return { error: "ui.lockedSet" as const };
  const tasks = await prisma.task.findMany({
    where: { id: { in: sourceIds }, group: { teacherId } },
  });
  if (tasks.length !== sourceIds.length || sourceIds.length > 100)
    return { error: "err.selectTask" as const };
  if (
    lesson.trainingMinutes !== null &&
    tasks.some((task) => !isTrainingSupportedTaskType(task.type))
  )
    return { error: "lesson.unsupportedTimed" as const };
  const prepared: {
    sourceId: number;
    fingerprint: string;
    copy: Awaited<ReturnType<typeof prepareLessonTaskCopy>>;
  }[] = [];
  let committed = false;
  let used = new Set<number>();
  try {
    for (const id of sourceIds) {
      const task = tasks.find((task) => task.id === id)!;
      prepared.push({
        sourceId: id,
        fingerprint: taskFingerprint(task),
        copy: await prepareLessonTaskCopy(
          task,
          lesson.groupId,
          lesson.isPublished,
        ),
      });
    }
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "TaskSet" WHERE id = ${setId} FOR UPDATE`;
        const current = await tx.taskSet.findFirst({
          where: { id: setId, group: { teacherId } },
          include: {
            items: { include: { task: true } },
            _count: { select: { attempts: true } },
          },
        });
        if (!current) return { error: "lesson.notFound" as const };
        if (current._count.attempts) return { error: "ui.lockedSet" as const };
        if (
          current.trainingMinutes !== null &&
          tasks.some((task) => !isTrainingSupportedTaskType(task.type))
        )
          return { error: "lesson.unsupportedTimed" as const };
        const fingerprints = new Set(
          current.items.map((item) => taskFingerprint(item.task)),
        );
        const usedSourceIds: number[] = [];
        let position = Math.max(
          0,
          ...current.items.map((item) => item.position),
        );
        for (const item of prepared) {
          if (fingerprints.has(item.fingerprint)) continue;
          const task = await tx.task.create({
            data: { ...item.copy.data, isPublished: current.isPublished },
          });
          await tx.taskSetItem.create({
            data: { setId, taskId: task.id, position: ++position },
          });
          fingerprints.add(item.fingerprint);
          usedSourceIds.push(item.sourceId);
        }
        return { groupId: current.groupId, usedSourceIds };
      },
      { timeout: 30_000 },
    );
    if (result.error) return result;
    used = new Set(result.usedSourceIds);
    committed = true;
    return { groupId: result.groupId };
  } finally {
    await Promise.allSettled(
      prepared
        .filter((item) => !committed || !used.has(item.sourceId))
        .flatMap((item) => item.copy.files)
        .map(deleteUploadedFile),
    );
  }
}
