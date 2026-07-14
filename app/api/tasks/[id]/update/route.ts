import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { getT } from "@/lib/i18n";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import {
  isMapTask,
  parseClassificationNumber,
  parseMapNumber,
  parseOptionalDeadline,
  parseTaskOptions,
  requiresOptions,
  taskDifficulties,
  taskGrades,
  validateChoiceCorrectAnswer,
  validateOlympiadLevel,
  validateTaskType,
} from "@/lib/tasks";
import {
  deleteUploadedFile,
  hasStorageRoom,
  isAllowedImageFileName,
  isUploadTooLarge,
  maxUploadLabel,
  saveUploadedFile,
  storageLimitLabel,
} from "@/lib/uploads";

export const runtime = "nodejs";

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
  const opensAt = parseOptionalDeadline(String(formData.get("opensAt") ?? ""));
  const dueAt = parseOptionalDeadline(String(formData.get("dueAt") ?? ""));
  // Черновик может иметь запланированную дату публикации; у опубликованной задачи она не нужна.
  const isPublished = String(formData.get("published") ?? "published") !== "draft";
  const publishAt = isPublished ? null : parseOptionalDeadline(String(formData.get("publishAt") ?? ""));
  // Классификация: все поля необязательные, но значения — только из списков.
  const grade = parseClassificationNumber(String(formData.get("grade") ?? ""), taskGrades);
  const difficulty = parseClassificationNumber(String(formData.get("difficulty") ?? ""), taskDifficulties);
  const olympiadLevelRaw = String(formData.get("olympiadLevel") ?? "").trim();
  const olympiadLevel = olympiadLevelRaw ? validateOlympiadLevel(olympiadLevelRaw) : null;
  // Картозадача: цель в процентах ширины (y может превышать 100 у вертикальных карт).
  const mapTargetX = parseMapNumber(String(formData.get("mapTargetX") ?? ""), 0, 100);
  const mapTargetY = parseMapNumber(String(formData.get("mapTargetY") ?? ""), 0, 300);
  const mapRadius = parseMapNumber(String(formData.get("mapRadius") ?? ""), 0.5, 50);

  if (!title || !description || !Number.isInteger(maxScore) || maxScore <= 0 || !type) {
    return redirectWithError(request, backTo, t("err.taskFields"));
  }

  const parsedOptions = parseTaskOptions(options);

  if (requiresOptions(type) && parsedOptions.length < 2) {
    return redirectWithError(request, backTo, t("err.taskOptions"));
  }

  const correctAnswerError = validateChoiceCorrectAnswer(type, parsedOptions, correctAnswer);
  if (correctAnswerError) {
    const message =
      correctAnswerError.code === "required"
        ? t("err.correctRequired")
        : `${t("err.correctMismatchPre")} ${correctAnswerError.missing.join(", ")}.`;
    return redirectWithError(request, backTo, message);
  }

  if (opensAt === undefined || dueAt === undefined) {
    return redirectWithError(request, backTo, t("err.openDueDate"));
  }

  if (publishAt === undefined) {
    return redirectWithError(request, backTo, t("err.publishDate"));
  }

  if (grade === undefined || difficulty === undefined || (olympiadLevelRaw !== "" && olympiadLevel === null)) {
    return redirectWithError(request, backTo, t("err.classification"));
  }

  if (mapTargetX === undefined || mapTargetY === undefined || mapRadius === undefined) {
    return redirectWithError(request, backTo, t("err.mapCoords"));
  }

  if (isMapTask(type)) {
    const hasImage = (image instanceof File && image.size > 0) || task.imagePath !== null;

    if (!hasImage) {
      return redirectWithError(request, backTo, t("err.mapImage"));
    }

    if (mapTargetX === null || mapTargetY === null || mapRadius === null) {
      return redirectWithError(request, backTo, t("err.mapPointTeacher"));
    }
  }

  if (opensAt && dueAt && opensAt >= dueAt) {
    return redirectWithError(request, backTo, t("err.openBeforeDue"));
  }

  if (image instanceof File && isUploadTooLarge(image.size)) {
    return redirectWithError(request, backTo, `${t("err.imageTooBig")} ${maxUploadLabel()}.`);
  }

  if (image instanceof File && image.size > 0 && !isAllowedImageFileName(image.name)) {
    return redirectWithError(request, backTo, t("err.imageFormat"));
  }

  if (image instanceof File && image.size > 0 && !(await hasStorageRoom(image.size))) {
    return redirectWithError(
      request,
      backTo,
      `${t("err.storagePre")} (${storageLimitLabel()})${t("err.storageDeletePost")}`,
    );
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
      opensAt,
      dueAt,
      isPublished,
      publishAt,
      grade,
      olympiadLevel,
      difficulty,
      mapTargetX: isMapTask(type) ? mapTargetX : null,
      mapTargetY: isMapTask(type) ? mapTargetY : null,
      mapRadius: isMapTask(type) ? mapRadius : null,
    },
  });

  if (savedImage && task.imagePath) {
    await deleteUploadedFile(task.imagePath);
  }

  return redirectAfterPost(request, backTo);
}
