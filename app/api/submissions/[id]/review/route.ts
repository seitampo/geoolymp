import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError, redirectWithSuccess } from "@/lib/formResponse";
import { getT } from "@/lib/i18n";
import { notifyStudentAboutReview } from "@/lib/notifications";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const submissionId = parseEntityId(id);

  if (!user || user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (submissionId === null) {
    return NextResponse.json({ error: "Решение не найдено." }, { status: 404 });
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { task: { include: { group: true } }, student: true },
  });

  if (!submission || submission.task.group.teacherId !== user.id) {
    return NextResponse.json({ error: "Решение не найдено." }, { status: 404 });
  }

  const formData = await request.formData();
  // Из режима очереди возвращаемся в очередь: после сохранения проверенное решение
  // исчезает из неё, и учитель сразу видит следующее непроверенное.
  const fromQueue = String(formData.get("filter") ?? "") === "pending";
  const backTo = `/groups/${submission.task.groupId}?tab=submissions${fromQueue ? "&filter=pending" : ""}`;
  const score = Number(formData.get("score"));
  const feedback = String(formData.get("feedback") ?? "").trim();

  if (!Number.isInteger(score) || score < 0 || score > submission.task.maxScore) {
    return redirectWithError(
      request,
      backTo,
      `${t("err.scoreRangePre")} ${submission.task.maxScore}${t("err.scoreRangePost")}`,
    );
  }

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: "REVIEWED",
      review: {
        upsert: {
          // Сброс seenByStudentAt: изменённая оценка снова помечается «Новый результат».
          update: { score, feedback, seenByStudentAt: null },
          create: { score, feedback },
        },
      },
    },
  });

  await notifyStudentAboutReview({
    studentEmail: submission.student.email,
    studentName: submission.student.name,
    taskTitle: submission.task.title,
    score,
    maxScore: submission.task.maxScore,
  });

  return redirectWithSuccess(request, backTo, t("ok.reviewSaved"));
}
