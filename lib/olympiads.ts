import { randomInt } from "crypto";
import { prisma } from "./prisma";
import { isAnswerCorrect, isAutoGradedTask } from "./tasks";

export type OlympiadPhase = "upcoming" | "running" | "closed";

export function getOlympiadPhase(
  olympiad: { opensAt: Date; closesAt: Date },
  now = new Date(),
): OlympiadPhase {
  if (now < olympiad.opensAt) {
    return "upcoming";
  }

  return now >= olympiad.closesAt ? "closed" : "running";
}

export function getOlympiadPhaseLabel(phase: OlympiadPhase) {
  if (phase === "upcoming") return "Скоро";
  if (phase === "running") return "Идёт";
  return "Завершена";
}

/** Общее время олимпиады: целое число минут от 10 до 600. */
export function parseOlympiadDuration(value: string): number | undefined {
  const minutes = Number(value);
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= 600 ? minutes : undefined;
}

/** Перемешивание порядка задач участника (Фишер–Йетс). */
export function shuffleTaskIds(taskIds: number[]) {
  const result = [...taskIds];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/** Порядок задач попытки хранится JSON-массивом id. */
export function parseTaskOrder(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value) => Number.isInteger(value)) : [];
  } catch {
    return [];
  }
}

/** Ученик видит олимпиаду, если состоит хотя бы в одной из назначенных групп. */
export async function canStudentAccessOlympiad(olympiadId: number, userId: number) {
  const assignment = await prisma.olympiadGroup.findFirst({
    where: { olympiadId, group: { memberships: { some: { userId } } } },
    select: { id: true },
  });

  return assignment !== null;
}

/** Для файловых роутов: участник олимпиады с этой задачей (задача может быть из чужой группы). */
export async function hasOlympiadAttemptForTask(studentId: number, taskId: number) {
  const attempt = await prisma.olympiadAttempt.findFirst({
    where: { studentId, olympiad: { tasks: { some: { taskId } } } },
    select: { id: true },
  });

  return attempt !== null;
}

/**
 * Завершение попытки: автопроверка задач с вариантами (часть 2), фиксация времени.
 * Текстовые ответы остаются с isCorrect = null — их оценивает учитель на странице
 * результатов. Идемпотентна.
 */
export async function finalizeOlympiadAttempt(attemptId: number) {
  const attempt = await prisma.olympiadAttempt.findUnique({
    where: { id: attemptId },
    include: {
      answers: true,
      olympiad: { include: { tasks: { include: { task: true } } } },
    },
  });

  if (!attempt || attempt.finishedAt) {
    return;
  }

  const now = new Date();
  const finishedAt = now > attempt.expiresAt ? attempt.expiresAt : now;

  await prisma.$transaction(async (transaction) => {
    for (const answer of attempt.answers) {
      const task = attempt.olympiad.tasks.find((item) => item.taskId === answer.taskId)?.task;

      if (!task || !isAutoGradedTask(task.type) || !task.correctAnswer) {
        continue;
      }

      const correct = isAnswerCorrect(task.type, answer.answer, task.correctAnswer);
      await transaction.olympiadAnswer.update({
        where: { id: answer.id },
        data: { isCorrect: correct, score: correct ? task.maxScore : 0 },
      });
    }

    await transaction.olympiadAttempt.update({
      where: { id: attemptId },
      data: { finishedAt },
    });
  });
}

/** Ленивая финализация просроченных попыток — вызывается при отдаче результатов. */
export async function finalizeExpiredOlympiadAttempts(olympiadId: number) {
  const expired = await prisma.olympiadAttempt.findMany({
    where: { olympiadId, finishedAt: null, expiresAt: { lt: new Date() } },
    select: { id: true },
  });

  for (const attempt of expired) {
    await finalizeOlympiadAttempt(attempt.id);
  }
}
