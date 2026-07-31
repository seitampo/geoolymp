import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectWithError, redirectWithSuccess } from "@/lib/formResponse";
import { getT } from "@/lib/i18n";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";

/**
 * Оценка ответа в пробной олимпиаде. Нужна для типов без автопроверки (текстовый
 * ответ): автопроверка их пропускает, и без этого роута такой ответ навсегда
 * остаётся с нулём — выставить балл было негде.
 *
 * isCorrect выставляем по факту ненулевого балла: от него зависят чипы прогресса
 * на странице подборки.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const answerId = parseEntityId(id);

  if (!user || user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (answerId === null) {
    return NextResponse.json({ error: "Ответ не найден." }, { status: 404 });
  }

  const answer = await prisma.trainingAnswer.findUnique({
    where: { id: answerId },
    include: { task: true, attempt: { include: { set: { include: { group: true } } } } },
  });

  // Оценивать может только учитель той группы, которой принадлежит подборка.
  if (!answer || answer.attempt.set.group.teacherId !== user.id) {
    return NextResponse.json({ error: "Ответ не найден." }, { status: 404 });
  }

  const groupId = answer.attempt.set.groupId;
  const backTo = `/groups/${groupId}/sets/${answer.attempt.setId}`;
  const formData = await request.formData();
  const score = Number(formData.get("score"));

  if (!Number.isInteger(score) || score < 0 || score > answer.task.maxScore) {
    return redirectWithError(
      request,
      backTo,
      `${t("err.scoreRangePre")} ${answer.task.maxScore}${t("err.scoreRangePost")}`,
    );
  }

  await prisma.trainingAnswer.update({
    where: { id: answerId },
    data: { score, isCorrect: score > 0 },
  });

  return redirectWithSuccess(request, backTo, t("ok.reviewSaved"));
}
