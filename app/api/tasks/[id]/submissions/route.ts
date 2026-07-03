import { Role } from "@prisma/client";
import { unlink } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { parseEntityId } from "@/lib/params";
import { canOpenGroup } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  formatDateTime,
  isAnswerCorrect,
  isAutoGradedTask,
  isTaskNotYetOpen,
  isTaskOverdue,
  isTaskVisibleToStudents,
  normalizeMultipleChoiceAnswer,
  parseTaskOptions,
} from "@/lib/tasks";
import { isTaskInTrainingSet } from "@/lib/training";
import {
  getAbsoluteUploadPath,
  isAllowedImageFileName,
  isUploadTooLarge,
  maxUploadLabel,
  saveUploadedFile,
} from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const taskId = parseEntityId(id);

  if (!user || user.role !== Role.STUDENT) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (taskId === null) {
    return NextResponse.json({ error: "Задача не найдена." }, { status: 404 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  // Черновик для ученика не существует — как и задача из чужой группы.
  if (!task || !isTaskVisibleToStudents(task) || !(await canOpenGroup(user.id, task.groupId))) {
    return NextResponse.json({ error: "Задача не найдена." }, { status: 404 });
  }

  const backTo = `/groups/${task.groupId}?tab=tasks`;

  // Тренировочные задачи решаются только внутри попытки (/api/training/*):
  // обычная отправка раскрыла бы правильный ответ автопроверкой до тренировки.
  if (await isTaskInTrainingSet(task.id)) {
    return redirectWithError(request, backTo, "Эта задача решается только в режиме тренировки.");
  }

  // Сроки проверяются на сервере: скрытая форма в интерфейсе не защищает от прямого POST.
  if (isTaskNotYetOpen(task)) {
    return redirectWithError(request, backTo, `Задача ещё не открыта — станет доступна ${formatDateTime(task.opensAt!)}.`);
  }

  if (isTaskOverdue(task)) {
    return redirectWithError(request, backTo, `Срок сдачи истёк ${formatDateTime(task.dueAt!)} — отправка недоступна.`);
  }

  const formData = await request.formData();
  const selectedAnswers = formData.getAll("answer").map((value) => String(value));
  const answer =
    task.type === "MULTIPLE_CHOICE"
      ? normalizeMultipleChoiceAnswer(selectedAnswers)
      : String(formData.get("answer") ?? "").trim();
  const file = formData.get("file");

  // Для задач с вариантами принимаем только ответы из списка — иначе прямой POST
  // мог бы записать произвольную строку и сломать автопроверку.
  if (isAutoGradedTask(task.type)) {
    const options = parseTaskOptions(task.options);
    const givenAnswers =
      task.type === "MULTIPLE_CHOICE"
        ? selectedAnswers.map((value) => value.trim()).filter(Boolean)
        : answer
          ? [answer]
          : [];

    if (givenAnswers.length === 0 || givenAnswers.some((value) => !options.includes(value))) {
      return redirectWithError(request, backTo, "Выберите вариант ответа из списка.");
    }
  }

  if (file instanceof File && isUploadTooLarge(file.size)) {
    return redirectWithError(request, backTo, `Файл слишком большой. Максимум — ${maxUploadLabel()}.`);
  }

  if (
    task.type === "IMAGE_UPLOAD" &&
    file instanceof File &&
    file.size > 0 &&
    !isAllowedImageFileName(file.name)
  ) {
    return redirectWithError(request, backTo, "Изображение должно быть в формате JPG, PNG или WebP.");
  }

  const savedFile = file instanceof File && file.size > 0 ? await saveUploadedFile(file, "submissions") : null;
  const oldSubmission = await prisma.submission.findUnique({
    where: { taskId_studentId: { taskId, studentId: user.id } },
  });

  if (!answer && !savedFile && !oldSubmission?.filePath) {
    return redirectWithError(request, backTo, "Добавьте ответ или файл.");
  }

  // Автопроверка задач с вариантами: балл выставляется сразу при отправке,
  // учителю такие решения вручную проверять не нужно. Частичного балла нет:
  // полное совпадение — maxScore, иначе 0.
  const autoReview =
    isAutoGradedTask(task.type) && task.correctAnswer
      ? isAnswerCorrect(task.type, answer, task.correctAnswer)
        ? { score: task.maxScore, feedback: "Автопроверка: ответ верный." }
        : { score: 0, feedback: "Автопроверка: ответ неверный." }
      : null;

  // Если ученик отправляет ответ повторно, старая проверка больше не актуальна.
  await prisma.$transaction(async (transaction) => {
    if (oldSubmission) {
      await transaction.review.deleteMany({ where: { submissionId: oldSubmission.id } });
    }

    const submission = await transaction.submission.upsert({
      where: { taskId_studentId: { taskId, studentId: user.id } },
      update: {
        answer,
        status: autoReview ? "REVIEWED" : "PENDING",
        filePath: savedFile?.filePath ?? oldSubmission?.filePath,
        originalFileName: savedFile?.originalFileName ?? oldSubmission?.originalFileName,
      },
      create: {
        taskId,
        studentId: user.id,
        answer,
        status: autoReview ? "REVIEWED" : "PENDING",
        filePath: savedFile?.filePath,
        originalFileName: savedFile?.originalFileName,
      },
    });

    if (autoReview) {
      await transaction.review.create({
        data: { submissionId: submission.id, ...autoReview },
      });
    }

    if (savedFile && oldSubmission?.filePath) {
      await unlink(getAbsoluteUploadPath(oldSubmission.filePath)).catch(() => undefined);
    }
  });

  return redirectAfterPost(request, backTo);
}
