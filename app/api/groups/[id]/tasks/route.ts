import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectWithError, redirectWithSuccess } from "@/lib/formResponse";
import { getT } from "@/lib/i18n";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
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
  const groupId = parseEntityId(id);

  if (!user || user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (groupId === null) {
    return NextResponse.json({ error: "Группа не найдена." }, { status: 404 });
  }

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group || group.teacherId !== user.id) {
    return NextResponse.json({ error: "Группа не найдена." }, { status: 404 });
  }

  let backTo = `/groups/${groupId}?tab=tasks`;
  const formData = await request.formData();
  const rawSetId = String(formData.get("setId") ?? "");
  const setId = rawSetId ? parseEntityId(rawSetId) : null;
  if (rawSetId && setId === null)
    return redirectWithError(request, backTo, t("err.selectTask"));
  const targetSet =
    setId === null
      ? null
      : await prisma.taskSet.findUnique({
          where: { id: setId },
          include: { _count: { select: { attempts: true } } },
        });
  if (setId !== null && (!targetSet || targetSet.groupId !== groupId))
    return redirectWithError(request, backTo, t("err.taskNotInGroup"));
  if (targetSet) {
    backTo = "/groups/" + groupId + "/sets/" + targetSet.id;
    if (targetSet._count.attempts)
      return redirectWithError(request, backTo, t("ui.lockedSet"));
  }
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

  if (
    targetSet?.trainingMinutes !== null &&
    targetSet &&
    !isTrainingSupportedTaskType(type)
  )
    return redirectWithError(request, backTo, t("err.taskNotInTraining"));

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
    if (!(image instanceof File) || image.size === 0) {
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

  // accept="image/*" в форме — только клиентская подсказка; проверяем расширение на сервере,
  // потому что файл отдаётся ученикам с image/* Content-Type.
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

  const createdInSet = await prisma.$transaction(async (tx) => {
    if (setId !== null) {
      await tx.$queryRaw`SELECT id FROM "TaskSet" WHERE id = ${setId} FOR UPDATE`;
      if (await tx.trainingAttempt.count({ where: { setId } })) return false;
    }
    const created = await tx.task.create({
      data: {
        groupId,
        isPublished: targetSet?.isPublished ?? false,
        title,
        description,
        maxScore,
        type,
        options: options || null,
        correctAnswer: correctAnswer || null,
        explanationText: explanation.text || null,
        explanationFilePath: explanation.file?.filePath,
        explanationFileName: explanation.file?.originalFileName,
        imagePath: savedImage?.filePath,
        originalImageName: savedImage?.originalFileName,
        mapTargetX: isMapTask(type) ? mapTargetX : null,
        mapTargetY: isMapTask(type) ? mapTargetY : null,
        mapRadius: isMapTask(type) ? mapRadius : null,
      },
    });
    if (setId !== null) {
      const max = await tx.taskSetItem.aggregate({
        where: { setId },
        _max: { position: true },
      });
      await tx.taskSetItem.create({
        data: {
          setId,
          taskId: created.id,
          position: (max._max.position ?? 0) + 1,
        },
      });
    }
    return created.id;
  });

  if (!createdInSet) {
    if (savedImage) await deleteUploadedFile(savedImage.filePath);
    if (explanation.file) await deleteUploadedFile(explanation.file.filePath);
    return redirectWithError(request, backTo, t("ui.lockedSet"));
  }
  return redirectWithSuccess(
    request,
    (targetSet ? backTo + "?step=content" : backTo) + "#task-" + createdInSet,
    t("ok.taskCreated"),
  );
}
