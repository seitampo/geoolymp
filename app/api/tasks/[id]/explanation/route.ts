import { Role } from "@prisma/client";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import {
  allowedImageExtensions,
  deleteUploadedFile,
  hasStorageRoom,
  isUploadTooLarge,
  maxUploadLabel,
  saveUploadedFile,
  storageLimitLabel,
} from "@/lib/uploads";

export const runtime = "nodejs";

const allowedExplanationExtensions = [".pdf", ...allowedImageExtensions];

/** Сохранение разбора решения: текст и/или файл (PDF или изображение). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  const explanationText = String(formData.get("explanationText") ?? "").trim();
  const file = formData.get("file");
  const newFileSelected = file instanceof File && file.size > 0;

  if (!explanationText && !newFileSelected && !task.explanationFilePath) {
    return redirectWithError(request, backTo, "Добавьте текст разбора или файл.");
  }

  if (newFileSelected && isUploadTooLarge(file.size)) {
    return redirectWithError(request, backTo, `Файл слишком большой. Максимум — ${maxUploadLabel()}.`);
  }

  if (
    newFileSelected &&
    !allowedExplanationExtensions.includes(path.extname(file.name).toLowerCase())
  ) {
    return redirectWithError(request, backTo, "Файл разбора — PDF, JPG, PNG или WebP.");
  }

  if (newFileSelected && !(await hasStorageRoom(file.size))) {
    return redirectWithError(request, backTo, `Достигнут лимит хранилища (${storageLimitLabel()}). Удалите ненужные файлы.`);
  }

  const savedFile = newFileSelected ? await saveUploadedFile(file, "tasks") : null;

  await prisma.task.update({
    where: { id: taskId },
    data: {
      explanationText: explanationText || null,
      explanationFilePath: savedFile?.filePath ?? task.explanationFilePath,
      explanationFileName: savedFile?.originalFileName ?? task.explanationFileName,
    },
  });

  if (savedFile && task.explanationFilePath) {
    await deleteUploadedFile(task.explanationFilePath);
  }

  return redirectAfterPost(request, backTo);
}
