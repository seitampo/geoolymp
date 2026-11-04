import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { getT } from "@/lib/i18n";
import { parseEntityId } from "@/lib/params";
import { canOpenGroup } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  finalizeTrainingAttempt,
  isTrainingSupportedTaskType,
} from "@/lib/training";
import { validateTrainingAnswer } from "@/lib/trainingAnswers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUserFromRequest(request);
  if (!user || user.role !== "STUDENT")
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  const attemptId = parseEntityId((await params).id);
  if (attemptId === null)
    return NextResponse.json({ error: "Попытка не найдена." }, { status: 404 });
  const t = await getT();
  const access = await prisma.trainingAttempt.findUnique({
    where: { id: attemptId },
    include: { set: true },
  });
  if (
    !access ||
    access.studentId !== user.id ||
    !(await canOpenGroup(user.id, access.set.groupId))
  )
    return NextResponse.json({ error: "Попытка не найдена." }, { status: 404 });
  const backTo =
    "/groups/" + access.set.groupId + "/sets/" + access.setId + "/training";
  let entries: { taskId: number; answer: string }[];
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = await request.json();
      if (
        !Array.isArray(body.answers) ||
        !body.answers.length ||
        body.answers.length > 1000
      )
        throw new Error();
      entries = body.answers;
      if (
        entries.some(
          (entry) =>
            !entry ||
            !Number.isSafeInteger(entry.taskId) ||
            entry.taskId <= 0 ||
            typeof entry.answer !== "string",
        )
      )
        throw new Error();
    } else {
      const data = await request.formData();
      const taskId = parseEntityId(String(data.get("taskId") ?? ""));
      if (taskId === null) throw new Error();
      entries = [
        { taskId, answer: data.getAll("answer").map(String).join("; ") },
      ];
    }
    if (new Set(entries.map((entry) => entry.taskId)).size !== entries.length)
      throw new Error();
  } catch {
    return redirectWithError(request, backTo, t("err.enterAnswer"));
  }
  const result = await prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "TrainingAttempt" WHERE id = ${attemptId} FOR UPDATE`;
      const attempt = await tx.trainingAttempt.findUnique({
        where: { id: attemptId },
        include: { set: { include: { items: { include: { task: true } } } } },
      });
      if (!attempt || attempt.finishedAt)
        return { error: "err.trainingFinished" as const };
      if (new Date() >= attempt.expiresAt)
        return { error: "err.trainingTimeUp" as const };
      const normalized: { taskId: number; answer: string }[] = [];
      for (const entry of entries) {
        const task = attempt.set.items.find(
          (item) => item.taskId === entry.taskId,
        )?.task;
        if (!task || !isTrainingSupportedTaskType(task.type))
          return { error: "err.taskNotInTraining" as const };
        const validated = validateTrainingAnswer(task, entry.answer);
        if ("error" in validated) return validated;
        normalized.push({ taskId: task.id, answer: validated.answer });
      }
      for (const entry of normalized) {
        if (!entry.answer)
          await tx.trainingAnswer.deleteMany({
            where: { attemptId, taskId: entry.taskId },
          });
        else
          await tx.trainingAnswer.upsert({
            where: { attemptId_taskId: { attemptId, taskId: entry.taskId } },
            update: { answer: entry.answer },
            create: { attemptId, taskId: entry.taskId, answer: entry.answer },
          });
      }
      return { ok: true };
    },
    { timeout: 15_000 },
  );
  if ("error" in result && result.error) {
    if (result.error === "err.trainingTimeUp")
      await finalizeTrainingAttempt(attemptId);
    return redirectWithError(request, backTo, t(result.error));
  }
  return redirectAfterPost(request, backTo);
}
