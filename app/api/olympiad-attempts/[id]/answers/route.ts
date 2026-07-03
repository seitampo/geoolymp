import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { finalizeOlympiadAttempt, parseTaskOrder } from "@/lib/olympiads";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { isAutoGradedTask, normalizeMultipleChoiceAnswer, parseTaskOptions } from "@/lib/tasks";

/** Сохранение ответа во время олимпиады (до завершения можно менять). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const attemptId = parseEntityId(id);

  if (!user || user.role !== Role.STUDENT) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (attemptId === null) {
    return NextResponse.json({ error: "Попытка не найдена." }, { status: 404 });
  }

  const attempt = await prisma.olympiadAttempt.findUnique({ where: { id: attemptId } });

  if (!attempt || attempt.studentId !== user.id) {
    return NextResponse.json({ error: "Попытка не найдена." }, { status: 404 });
  }

  const takeTo = `/olympiads/${attempt.olympiadId}/take`;

  if (attempt.finishedAt) {
    return redirectWithError(request, takeTo, "Олимпиада уже завершена.");
  }

  // Дедлайн контролирует сервер: просроченная попытка закрывается, ответ не принимается.
  if (new Date() > attempt.expiresAt) {
    await finalizeOlympiadAttempt(attempt.id);
    return redirectWithError(request, takeTo, "Время вышло — попытка завершена.");
  }

  const formData = await request.formData();
  const taskId = parseEntityId(String(formData.get("taskId") ?? ""));

  if (taskId === null || !parseTaskOrder(attempt.taskOrder).includes(taskId)) {
    return redirectWithError(request, takeTo, "Задача не найдена в олимпиаде.");
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    return redirectWithError(request, takeTo, "Задача не найдена.");
  }

  const selectedAnswers = formData.getAll("answer").map((value) => String(value));
  const answer =
    task.type === "MULTIPLE_CHOICE"
      ? normalizeMultipleChoiceAnswer(selectedAnswers)
      : String(formData.get("answer") ?? "").trim();

  if (isAutoGradedTask(task.type)) {
    const options = parseTaskOptions(task.options);
    const givenAnswers =
      task.type === "MULTIPLE_CHOICE"
        ? selectedAnswers.map((value) => value.trim()).filter(Boolean)
        : answer
          ? [answer]
          : [];

    if (givenAnswers.length === 0 || givenAnswers.some((value) => !options.includes(value))) {
      return redirectWithError(request, takeTo, "Выберите вариант ответа из списка.");
    }
  }

  if (!answer) {
    return redirectWithError(request, takeTo, "Введите ответ.");
  }

  await prisma.olympiadAnswer.upsert({
    where: { attemptId_taskId: { attemptId: attempt.id, taskId } },
    update: { answer },
    create: { attemptId: attempt.id, taskId, answer },
  });

  return redirectAfterPost(request, takeTo);
}
