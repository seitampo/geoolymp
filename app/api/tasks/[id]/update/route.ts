import { Role } from "@prisma/client";
import { unlink } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateTaskType } from "@/lib/tasks";
import { getAbsoluteUploadPath, saveUploadedFile } from "@/lib/uploads";

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

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const maxScore = Number(formData.get("maxScore"));
  const type = validateTaskType(String(formData.get("type") ?? "TEXT"));
  const options = String(formData.get("options") ?? "").trim();
  const correctAnswer = String(formData.get("correctAnswer") ?? "").trim();
  const image = formData.get("image");
  const savedImage = image instanceof File && image.size > 0 ? await saveUploadedFile(image, "tasks") : null;

  if (!title || !description || !Number.isInteger(maxScore) || maxScore <= 0 || !type) {
    return NextResponse.json(
      { error: "Заполните название, условие, тип и максимальный балл." },
      { status: 400 },
    );
  }

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

  return NextResponse.redirect(new URL(`/groups/${task.groupId}?tab=tasks`, request.url), 303);
}
