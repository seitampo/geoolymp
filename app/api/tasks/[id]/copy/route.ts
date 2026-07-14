import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { getT } from "@/lib/i18n";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { copyUploadedFile } from "@/lib/uploads";

export const runtime = "nodejs";

/** Дублирование задачи в выбранную группу учителя (включая копию изображения). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const taskId = parseEntityId(id);

  if (!user || user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (taskId === null) {
    return NextResponse.json({ error: "Задача не найдена." }, { status: 404 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { group: true } });
  if (!task || task.group.teacherId !== user.id) {
    return NextResponse.json({ error: "Задача не найдена." }, { status: 404 });
  }

  const backTo = `/groups/${task.groupId}?tab=tasks`;
  const formData = await request.formData();
  const targetGroupId = parseEntityId(String(formData.get("targetGroupId") ?? ""));

  if (targetGroupId === null) {
    return redirectWithError(request, backTo, t("err.selectGroup"));
  }

  const targetGroup = await prisma.group.findUnique({ where: { id: targetGroupId } });
  if (!targetGroup || targetGroup.teacherId !== user.id) {
    return redirectWithError(request, backTo, t("err.copyGroupNotFound"));
  }

  // Файл копируется физически: удаление оригинала не должно ломать копию.
  const copiedImagePath = task.imagePath ? await copyUploadedFile(task.imagePath, "tasks") : null;
  if (task.imagePath && copiedImagePath === null) {
    return redirectWithError(request, backTo, t("err.imageFileMissing"));
  }

  await prisma.task.create({
    data: {
      groupId: targetGroup.id,
      title: task.title,
      description: task.description,
      maxScore: task.maxScore,
      type: task.type,
      options: task.options,
      correctAnswer: task.correctAnswer,
      imagePath: copiedImagePath,
      originalImageName: copiedImagePath ? task.originalImageName : null,
      opensAt: task.opensAt,
      dueAt: task.dueAt,
      isPublished: task.isPublished,
      publishAt: task.publishAt,
      grade: task.grade,
      olympiadLevel: task.olympiadLevel,
      difficulty: task.difficulty,
      mapTargetX: task.mapTargetX,
      mapTargetY: task.mapTargetY,
      mapRadius: task.mapRadius,
    },
  });

  return redirectAfterPost(request, `/groups/${targetGroup.id}?tab=tasks`);
}
