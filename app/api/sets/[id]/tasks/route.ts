import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { getT } from "@/lib/i18n";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { isTrainingSupportedTaskType } from "@/lib/training";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUserFromRequest(request);
  const setId = parseEntityId((await params).id);
  if (!user || user.role !== "TEACHER")
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  if (setId === null)
    return NextResponse.json(
      { error: "Подборка не найдена." },
      { status: 404 },
    );
  const t = await getT();
  const form = await request.formData();
  const ids = form
    .getAll("taskId")
    .map((value) => parseEntityId(String(value)));
  if (
    !ids.length ||
    ids.some((id) => id === null) ||
    new Set(ids).size !== ids.length
  )
    return NextResponse.json({ error: t("err.selectTask") }, { status: 400 });
  const taskIds = ids as number[];
  const result = await prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "TaskSet" WHERE id = ${setId} FOR UPDATE`;
      const set = await tx.taskSet.findUnique({
        where: { id: setId },
        include: {
          group: true,
          items: true,
          _count: { select: { attempts: true } },
        },
      });
      if (!set || set.group.teacherId !== user.id)
        return { error: t("err.taskNotInGroup") };
      if (set._count.attempts) return { error: t("ui.lockedSet") };
      if (form.get("mode") === "reorder") {
        if (
          taskIds.length !== set.items.length ||
          set.items.some((item) => !taskIds.includes(item.taskId))
        )
          return { error: t("err.selectTask") };
        for (const [index, taskId] of taskIds.entries())
          await tx.taskSetItem.update({
            where: { setId_taskId: { setId, taskId } },
            data: { position: index + 1 },
          });
      } else {
        if (
          set.trainingMinutes === null &&
          (await tx.taskSetItem.findFirst({
            where: {
              taskId: { in: taskIds },
              set: { trainingMinutes: { not: null } },
            },
          }))
        )
          return { error: t("err.taskOnlyTraining") };
        const tasks = await tx.task.findMany({
          where: { id: { in: taskIds }, groupId: set.groupId },
        });
        if (
          tasks.length !== taskIds.length ||
          (set.trainingMinutes !== null &&
            tasks.some((task) => !isTrainingSupportedTaskType(task.type)))
        )
          return { error: t("err.taskNotInTraining") };
        let position = Math.max(0, ...set.items.map((item) => item.position));
        for (const taskId of taskIds) {
          if (set.items.some((item) => item.taskId === taskId)) continue;
          await tx.taskSetItem.create({
            data: { setId, taskId, position: ++position },
          });
        }
      }
      return { backTo: "/groups/" + set.groupId + "/sets/" + set.id };
    },
    { timeout: 15_000 },
  );
  if (result.error)
    return redirectWithError(request, "/dashboard", result.error);
  return redirectAfterPost(request, result.backTo ?? "/dashboard");
}
