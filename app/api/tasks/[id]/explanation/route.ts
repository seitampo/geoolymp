import { Role } from "@prisma/client";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { getT } from "@/lib/i18n";
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
  const explanationText = String(formData.get("explanationText") ?? "").trim();
  const file = formData.get("file");
  const newFileSelected = file instanceof File && file.size > 0;

  if (!explanationText && !newFileSelected && !task.explanationFilePath) {
    return redirectWithError(request, backTo, t("err.explanationContent"));
  }

  if (newFileSelected && isUploadTooLarge(file.size)) {
    return redirectWithError(request, backTo, `${t("err.fileTooBig")} ${maxUploadLabel()}.`);
  }

  if (
    newFileSelected &&
    !allowedExplanationExtensions.includes(path.extname(file.name).toLowerCase())
  ) {
    return redirectWithError(request, backTo, t("err.explanationFile"));
  }

  if (newFileSelected && !(await hasStorageRoom(file.size))) {
    return redirectWithError(
      request,
      backTo,
      `${t("err.storagePre")} (${storageLimitLabel()})${t("err.storageDeletePost")}`,
    );
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
