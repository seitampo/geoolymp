import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { getT } from "@/lib/i18n";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { taskHasStartedAttempts } from "@/lib/lockedTasks";
import { prepareTaskExplanation } from "@/lib/taskExplanation";
import { isTrainingSupportedTaskType } from "@/lib/training";
import {
  isMapTask,
  parseMapNumber,
  parseTaskOptions,
  requiresOptions,
  validateChoiceCorrectAnswer,
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  let backTo = `/groups/${task.groupId}?tab=tasks`;
  const formData = await request.formData();
  const requestedReturn = String(formData.get("returnTo") ?? "");
  const match = requestedReturn.match(/^\/groups\/\d+\/sets\/(\d+)$/);
  if (match) {
    const parent = await prisma.taskSet.findFirst({
      where: { id: Number(match[1]), groupId: task.groupId },
    });
    if (parent) backTo = requestedReturn;
  }
  const locked = await prisma.trainingAttempt.findFirst({
    where: { set: { items: { some: { taskId } } } },
    select: { id: true },
  });
  if (locked) return redirectWithError(request, backTo, t("ui.lockedSet"));

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const maxScore = Number(formData.get("maxScore"));
  const type = validateTaskType(String(formData.get("type") ?? "TEXT"));
  const options = String(formData.get("options") ?? "").trim();
  const correctAnswer = String(formData.get("correctAnswer") ?? "").trim();
  const image = formData.get("image");
  // Картозадача: цель в процентах ширины (y может превышать 100 у вертикальных карт).
  const mapTargetX = parseMapNumber(
    String(formData.get("mapTargetX") ?? ""),
    0,
    100,
  );
  const mapTargetY = parseMapNumber(
    String(formData.get("mapTargetY") ?? ""),
    0,
    300,
  );
  const mapRadius = parseMapNumber(
    String(formData.get("mapRadius") ?? ""),
    0.5,
    50,
  );

  if (
    !title ||
    !description ||
    !Number.isInteger(maxScore) ||
    maxScore <= 0 ||
    !type
  ) {
    return redirectWithError(request, backTo, t("err.taskFields"));
  }

  const parsedOptions = parseTaskOptions(options);

  if (requiresOptions(type) && parsedOptions.length < 2) {
    return redirectWithError(request, backTo, t("err.taskOptions"));
  }

  const correctAnswerError = validateChoiceCorrectAnswer(
    type,
    parsedOptions,
    correctAnswer,
  );
  if (correctAnswerError) {
    const message =
      correctAnswerError.code === "options"
        ? t("err.taskOptions")
        : correctAnswerError.code === "required"
          ? t("err.correctRequired")
          : `${t("err.correctMismatchPre")} ${correctAnswerError.missing.join(", ")}.`;
    return redirectWithError(request, backTo, message);
  }

  if (
    mapTargetX === undefined ||
    mapTargetY === undefined ||
    mapRadius === undefined
  ) {
    return redirectWithError(request, backTo, t("err.mapCoords"));
  }

  if (isMapTask(type)) {
    const hasImage =
      (image instanceof File && image.size > 0) || task.imagePath !== null;

    if (!hasImage) {
      return redirectWithError(request, backTo, t("err.mapImage"));
    }

    if (mapTargetX === null || mapTargetY === null || mapRadius === null) {
      return redirectWithError(request, backTo, t("err.mapPointTeacher"));
    }
  }

  if (image instanceof File && isUploadTooLarge(image.size)) {
    return redirectWithError(
      request,
      backTo,
      `${t("err.imageTooBig")} ${maxUploadLabel()}.`,
    );
  }

  if (
    image instanceof File &&
    image.size > 0 &&
    !isAllowedImageFileName(image.name)
  ) {
    return redirectWithError(request, backTo, t("err.imageFormat"));
  }

  if (
    image instanceof File &&
    image.size > 0 &&
    !(await hasStorageRoom(image.size))
  ) {
    return redirectWithError(
      request,
      backTo,
      `${t("err.storagePre")} (${storageLimitLabel()})${t("err.storageDeletePost")}`,
    );
  }

  const explanation = await prepareTaskExplanation(formData);
  if (explanation.error)
    return redirectWithError(request, backTo, t(explanation.error));
  const savedImage =
    image instanceof File && image.size > 0
      ? await saveUploadedFile(image, "tasks")
      : null;

  const updated = await prisma.$transaction(async (tx) => {
    if (await taskHasStartedAttempts(tx, taskId)) return false;
    await tx.task.update({
      where: { id: taskId },
      data: {
        title,
        description,
        maxScore,
        type,
        options: options || null,
        correctAnswer: correctAnswer || null,
        explanationText: explanation.text || null,
        explanationFilePath:
          explanation.file?.filePath ?? task.explanationFilePath,
        explanationFileName:
          explanation.file?.originalFileName ?? task.explanationFileName,
        imagePath: savedImage?.filePath ?? task.imagePath,
        originalImageName:
          savedImage?.originalFileName ?? task.originalImageName,
        mapTargetX: isMapTask(type) ? mapTargetX : null,
        mapTargetY: isMapTask(type) ? mapTargetY : null,
        mapRadius: isMapTask(type) ? mapRadius : null,
      },
    });

    return true;
  });
  if (!updated) {
    if (savedImage) await deleteUploadedFile(savedImage.filePath);
    if (explanation.file) await deleteUploadedFile(explanation.file.filePath);
    return redirectWithError(request, backTo, t("ui.lockedSet"));
  }

  if (explanation.file && task.explanationFilePath)
    await deleteUploadedFile(task.explanationFilePath);

  if (savedImage && task.imagePath) {
    await deleteUploadedFile(task.imagePath);
  }

  return redirectAfterPost(request, backTo);
}
