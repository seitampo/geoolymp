import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { getT } from "@/lib/i18n";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import {
  isAutoGradedTask,
  isMapTask,
  isTaskVisibleToStudents,
  normalizeMultipleChoiceAnswer,
  parseMapPoint,
  parseTaskOptions,
} from "@/lib/tasks";
import { finalizeTrainingAttempt, isTrainingSupportedTaskType } from "@/lib/training";

/** Сохранение ответа во время тренировки (до завершения можно менять). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const attemptId = parseEntityId(id);

  if (!user || user.role !== Role.STUDENT) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (attemptId === null) {
    return NextResponse.json({ error: "Попытка не найдена." }, { status: 404 });
  }

  const attempt = await prisma.trainingAttempt.findUnique({
    where: { id: attemptId },
    include: { set: true },
  });

  if (!attempt || attempt.studentId !== user.id) {
    return NextResponse.json({ error: "Попытка не найдена." }, { status: 404 });
  }

  const trainingTo = `/groups/${attempt.set.groupId}/sets/${attempt.setId}/training`;

  if (attempt.finishedAt) {
    return redirectWithError(request, trainingTo, t("err.trainingFinished"));
  }

  // Время контролирует сервер: просроченная попытка закрывается, ответ не принимается.
  if (new Date() > attempt.expiresAt) {
    await finalizeTrainingAttempt(attempt.id);
    return redirectWithError(request, trainingTo, t("err.trainingTimeUp"));
  }

  const formData = await request.formData();
  const taskId = parseEntityId(String(formData.get("taskId") ?? ""));

  if (taskId === null) {
    return redirectWithError(request, trainingTo, t("err.taskNotFound"));
  }

  const item = await prisma.taskSetItem.findUnique({
    where: { setId_taskId: { setId: attempt.setId, taskId } },
    include: { task: true },
  });

  if (
    !item ||
    !isTaskVisibleToStudents(item.task) ||
    !isTrainingSupportedTaskType(item.task.type)
  ) {
    return redirectWithError(request, trainingTo, t("err.taskNotInTraining"));
  }

  const selectedAnswers = formData.getAll("answer").map((value) => String(value));
  const answer =
    item.task.type === "MULTIPLE_CHOICE"
      ? normalizeMultipleChoiceAnswer(selectedAnswers)
      : String(formData.get("answer") ?? "").trim();

  if (isAutoGradedTask(item.task.type)) {
    const options = parseTaskOptions(item.task.options);
    const givenAnswers =
      item.task.type === "MULTIPLE_CHOICE"
        ? selectedAnswers.map((value) => value.trim()).filter(Boolean)
        : answer
          ? [answer]
          : [];

    if (givenAnswers.length === 0 || givenAnswers.some((value) => !options.includes(value))) {
      return redirectWithError(request, trainingTo, t("err.selectAnswerOption"));
    }
  }

  if (isMapTask(item.task.type) && parseMapPoint(answer) === null) {
    return redirectWithError(request, trainingTo, t("err.mapPointStudent"));
  }

  if (!answer) {
    return redirectWithError(request, trainingTo, t("err.enterAnswer"));
  }

  await prisma.trainingAnswer.upsert({
    where: { attemptId_taskId: { attemptId: attempt.id, taskId } },
    update: { answer },
    create: { attemptId: attempt.id, taskId, answer },
  });

  return redirectAfterPost(request, trainingTo);
}
