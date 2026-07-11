import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError, redirectWithSuccess } from "@/lib/formResponse";
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
import { isAllowedImageFileName, isUploadTooLarge, maxUploadLabel, saveUploadedFile } from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const backTo = `/groups/${groupId}?tab=tasks`;
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
    return redirectWithError(request, backTo, "Заполните название, условие, тип и максимальный балл (больше 0).");
  }

  const parsedOptions = parseTaskOptions(options);

  if (requiresOptions(type) && parsedOptions.length < 2) {
    return redirectWithError(request, backTo, "Для задачи с вариантами укажите минимум два варианта ответа (каждый с новой строки).");
  }

  const correctAnswerError = validateChoiceCorrectAnswer(type, parsedOptions, correctAnswer);
  if (correctAnswerError) {
    return redirectWithError(request, backTo, correctAnswerError);
  }

  if (opensAt === undefined || dueAt === undefined) {
    return redirectWithError(request, backTo, "Неверный формат даты открытия или срока сдачи.");
  }

  if (publishAt === undefined) {
    return redirectWithError(request, backTo, "Неверный формат даты публикации.");
  }

  if (grade === undefined || difficulty === undefined || (olympiadLevelRaw !== "" && olympiadLevel === null)) {
    return redirectWithError(request, backTo, "Неверные значения классификации (класс, уровень или сложность).");
  }

  if (mapTargetX === undefined || mapTargetY === undefined || mapRadius === undefined) {
    return redirectWithError(request, backTo, "Неверные координаты цели картозадачи.");
  }

  if (isMapTask(type)) {
    if (!(image instanceof File) || image.size === 0) {
      return redirectWithError(request, backTo, "Для картозадачи загрузите изображение карты.");
    }

    if (mapTargetX === null || mapTargetY === null || mapRadius === null) {
      return redirectWithError(request, backTo, "Отметьте правильную точку на карте и задайте допуск.");
    }
  }

  if (opensAt && dueAt && opensAt >= dueAt) {
    return redirectWithError(request, backTo, "Дата открытия должна быть раньше срока сдачи.");
  }

  if (image instanceof File && isUploadTooLarge(image.size)) {
    return redirectWithError(request, backTo, `Изображение слишком большое. Максимум — ${maxUploadLabel()}.`);
  }

  // accept="image/*" в форме — только клиентская подсказка; проверяем расширение на сервере,
  // потому что файл отдаётся ученикам с image/* Content-Type.
  if (image instanceof File && image.size > 0 && !isAllowedImageFileName(image.name)) {
    return redirectWithError(request, backTo, "Изображение должно быть в формате JPG, PNG или WebP.");
  }

  const savedImage = image instanceof File && image.size > 0 ? await saveUploadedFile(image, "tasks") : null;

  await prisma.task.create({
    data: {
      groupId,
      title,
      description,
      maxScore,
      type,
      options: options || null,
      correctAnswer: correctAnswer || null,
      imagePath: savedImage?.filePath,
      originalImageName: savedImage?.originalFileName,
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

  return redirectWithSuccess(request, backTo, "Задача создана.");
}
