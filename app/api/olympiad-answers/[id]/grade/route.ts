import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { isAutoCheckedTask } from "@/lib/tasks";

/** Ручная оценка текстового ответа олимпиады (со страницы результатов). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const answerId = parseEntityId(id);

  if (!user || user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (answerId === null) {
    return NextResponse.json({ error: "Ответ не найден." }, { status: 404 });
  }

  const answer = await prisma.olympiadAnswer.findUnique({
    where: { id: answerId },
    include: { task: true, attempt: { include: { olympiad: true } } },
  });

  if (!answer || answer.attempt.olympiad.teacherId !== user.id) {
    return NextResponse.json({ error: "Ответ не найден." }, { status: 404 });
  }

  const backTo = `/olympiads/${answer.attempt.olympiadId}/results`;

  // Тесты и картозадачи уже посчитаны автопроверкой — вручную оцениваются только текстовые.
  if (isAutoCheckedTask(answer.task)) {
    return redirectWithError(request, backTo, "Этот ответ оценивается автоматически.");
  }

  if (!answer.attempt.finishedAt) {
    return redirectWithError(request, backTo, "Попытка ещё не завершена.");
  }

  const formData = await request.formData();
  const score = Number(formData.get("score"));

  if (!Number.isInteger(score) || score < 0 || score > answer.task.maxScore) {
    return redirectWithError(
      request,
      backTo,
      `Балл должен быть целым числом от 0 до ${answer.task.maxScore}.`,
    );
  }

  await prisma.olympiadAnswer.update({
    where: { id: answerId },
    data: { score, gradedAt: new Date() },
  });

  return redirectAfterPost(request, backTo);
}
