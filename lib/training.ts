import { TaskType } from "@prisma/client";
import { prisma } from "./prisma";
import { isAnswerCorrect, isAutoGradedTask } from "./tasks";

/**
 * В тренировке участвуют задачи с текстовым ответом и с вариантами.
 * Загрузка файлов в режиме на время не поддерживается.
 */
export function isTrainingSupportedTaskType(type: TaskType) {
  return type === TaskType.TEXT || type === TaskType.SINGLE_CHOICE || type === TaskType.MULTIPLE_CHOICE;
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

      if (!task || !isAutoGradedTask(task.type) || !task.correctAnswer) {
        continue;
      }

      const correct = isAnswerCorrect(task.type, answer.answer, task.correctAnswer);
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
