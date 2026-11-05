import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { redirectWithError, redirectWithSuccess } from "@/lib/formResponse";
import { isTrainingSupportedTaskType } from "@/lib/training";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUserFromRequest(request);
  if (!user || user.role !== "TEACHER")
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  const setId = parseEntityId((await params).id);
  if (setId === null)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const t = await getT();
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "TaskSet" WHERE id = ${setId} FOR UPDATE`;
    const lesson = await tx.taskSet.findUnique({
      where: { id: setId },
      include: {
        group: true,
        items: { include: { task: true } },
        materials: true,
      },
    });
    if (!lesson || lesson.group.teacherId !== user.id)
      return { error: t("lesson.notFound") };
    if (!lesson.items.length && !lesson.materials.length)
      return { error: t("lesson.emptyIssue") };
    if (
      lesson.trainingMinutes !== null &&
      (!lesson.items.length ||
        lesson.items.some(
          (item) => !isTrainingSupportedTaskType(item.task.type),
        ))
    )
      return { error: t("lesson.unsupportedTimed") };
    await tx.taskSet.update({
      where: { id: setId },
      data: { isPublished: true, assignedAt: lesson.assignedAt ?? new Date() },
    });
    await tx.task.updateMany({
      where: { id: { in: lesson.items.map((item) => item.taskId) } },
      data: { isPublished: true },
    });
    await tx.material.updateMany({
      where: { id: { in: lesson.materials.map((material) => material.id) } },
      data: { isPublished: true },
    });
    return { groupId: lesson.groupId };
  });
  if (result.error)
    return redirectWithError(request, "/dashboard", result.error);
  return redirectWithSuccess(
    request,
    "/groups/" + result.groupId + "/sets/" + setId + "?step=results",
    t("lesson.issuedSuccess"),
  );
}
