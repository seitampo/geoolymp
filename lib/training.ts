import { TaskType } from "@prisma/client";
import { prisma } from "./prisma";
import { autoCheckAnswer } from "./tasks";

/**
 * В тренировке (и олимпиаде) участвуют задачи с текстовым ответом, с вариантами
 * и картозадачи. Загрузка файлов в режиме на время не поддерживается.
 */
export function isTrainingSupportedTaskType(type: TaskType) {
  return (
    type === TaskType.TEXT ||
    type === TaskType.SINGLE_CHOICE ||
    type === TaskType.MULTIPLE_CHOICE ||
    type === TaskType.MAP_POINT
  );
}

/**
 * Prisma-условие «задача не входит ни в одну тренировочную подборку».
 * Тренировочные задачи на карантине: ученик видит их только внутри попытки,
 * иначе автопроверка на вкладке задач раскрыла бы правильные ответы до тренировки.
 */
export const notInTrainingSetFilter = {
  setItems: { none: { set: { trainingMinutes: { not: null } } } },
} as const;

/** Входит ли задача хотя бы в одну тренировочную подборку. */
export async function isTaskInTrainingSet(taskId: number) {
  const item = await prisma.taskSetItem.findFirst({
    where: { taskId, set: { trainingMinutes: { not: null } } },
    select: { id: true },
  });
  return item !== null;
}

/** id всех задач группы, занятых в тренировочных подборках. */
export async function getTrainingTaskIds(groupId: number) {
  const items = await prisma.taskSetItem.findMany({
    where: { set: { groupId, trainingMinutes: { not: null } } },
    select: { taskId: true },
  });
  return new Set(items.map((item) => item.taskId));
}

/** Есть ли у ученика попытка (идущая или завершённая) в тренировке с этой задачей. */
export async function hasTrainingAttemptForTask(studentId: number, taskId: number) {
  const attempt = await prisma.trainingAttempt.findFirst({
    where: { studentId, set: { trainingMinutes: { not: null }, items: { some: { taskId } } } },
    select: { id: true },
  });
  return attempt !== null;
}

/** Разбор необязательного лимита времени (в минутах) из формы подборки. */
export function parseTrainingMinutes(value: string): number | null | undefined {
  if (!value.trim()) {
    return null;
  }

  const minutes = Number(value);
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= 600 ? minutes : undefined;
}

/**
 * Завершение попытки: автопроверка ответов на задачи с вариантами (логика части 2)
 * и фиксация времени окончания. Вызывается кнопкой «Завершить» и автоматически,
 * когда сервер видит истёкший дедлайн. Идемпотентна.
 */
export async function finalizeTrainingAttempt(attemptId: number) {
  const attempt = await prisma.trainingAttempt.findUnique({
    where: { id: attemptId },
    include: {
      answers: true,
      set: { include: { items: { include: { task: true } } } },
    },
  });

  if (!attempt || attempt.finishedAt) {
    return;
  }

  const now = new Date();
  // Если время вышло, попытка «закончилась» в момент дедлайна, а не когда ученик открыл страницу.
  const finishedAt = now > attempt.expiresAt ? attempt.expiresAt : now;

  await prisma.$transaction(async (transaction) => {
    for (const answer of attempt.answers) {
      const task = attempt.set.items.find((item) => item.taskId === answer.taskId)?.task;

      if (!task) {
        continue;
      }

      const correct = autoCheckAnswer(task, answer.answer);
      if (correct === null) {
        continue;
      }

      await transaction.trainingAnswer.update({
        where: { id: answer.id },
        data: { isCorrect: correct, score: correct ? task.maxScore : 0 },
      });
    }

    await transaction.trainingAttempt.update({
      where: { id: attemptId },
      data: { finishedAt },
    });
  });
}
