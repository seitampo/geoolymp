import { Role } from "@prisma/client";
import { unlink } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { prisma } from "@/lib/prisma";
import { parseTaskOptions, requiresOptions, validateTaskType } from "@/lib/tasks";
import { getAbsoluteUploadPath, isUploadTooLarge, maxUploadLabel, saveUploadedFile } from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const taskId = Number(id);

  if (!user || user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { group: true },
  });

  if (!task || task.group.teacherId !== user.id) {
    return NextResponse.json({ error: "Задача не найдена." }, { status: 404 });
  }

  const backTo = `/groups/${task.groupId}?tab=tasks`;
  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const maxScore = Number(formData.get("maxScore"));
  const type = validateTaskType(String(formData.get("type") ?? "TEXT"));
  const options = String(formData.get("options") ?? "").trim();
  const correctAnswer = String(formData.get("correctAnswer") ?? "").trim();
  const image = formData.get("image");

  if (!title || !description || !Number.isInteger(maxScore) || maxScore <= 0 || !type) {
    return redirectWithError(request, backTo, "Заполните название, условие, тип и максимальный балл (больше 0).");
  }

  if (requiresOptions(type) && parseTaskOptions(options).length < 2) {
    return redirectWithError(request, backTo, "Для задачи с вариантами укажите минимум два варианта ответа (каждый с новой строки).");
  }

  if (image instanceof File && isUploadTooLarge(image.size)) {
    return redirectWithError(request, backTo, `Изображение слишком большое. Максимум — ${maxUploadLabel()}.`);
  }

  const savedImage = image instanceof File && image.size > 0 ? await saveUploadedFile(image, "tasks") : null;

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title,
      description,
      maxScore,
      type,
      options: options || null,
      correctAnswer: correctAnswer || null,
      imagePath: savedImage?.filePath ?? task.imagePath,
      originalImageName: savedImage?.originalFileName ?? task.originalImageName,
    },
  });

  if (savedImage && task.imagePath) {
    await unlink(getAbsoluteUploadPath(task.imagePath)).catch(() => undefined);
  }

  return redirectAfterPost(request, backTo);
}
