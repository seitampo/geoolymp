import type { LessonData } from "./lessonData";
import type { LessonSummary } from "@/components/lessons/LessonList";
import { lessonProgress } from "./lessonProgress";
export function summarizeLesson(
  lesson: LessonData,
  studentIds: number[],
  userId: number,
): LessonSummary {
  const progress = lessonProgress(lesson.items, studentIds);
  const own = progress.members.find((row) => row.studentId === userId);
  const ownAttempt = lesson.attempts.find((row) => row.studentId === userId);
  const materialsComplete = (id: number) =>
    lesson.materials.length > 0 &&
    lesson.materials.every((material) =>
      material.views.some((view) => view.userId === id),
    );
  const timed = lesson.trainingMinutes !== null;
  const finished = lesson.attempts.filter(
    (attempt) => attempt.finishedAt && studentIds.includes(attempt.studentId),
  );
  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    trainingMinutes: lesson.trainingMinutes,
    isPublished: lesson.isPublished,
    taskCount: lesson.items.length,
    materialCount: lesson.materials.length,
    memberCount: studentIds.length,
    completed: timed
      ? finished.length
      : lesson.items.length
        ? progress.completed
        : studentIds.filter(materialsComplete).length,
    pending: timed
      ? finished.reduce(
          (sum, attempt) =>
            sum +
            attempt.answers.filter((answer) => answer.isCorrect === null)
              .length,
          0,
        )
      : progress.pending,
    answered: timed ? (ownAttempt?.answers.length ?? 0) : (own?.submitted ?? 0),
    ownComplete: timed
      ? Boolean(ownAttempt?.finishedAt)
      : lesson.items.length
        ? (own?.complete ?? false)
        : materialsComplete(userId),
    assignedDate: lesson.assignedAt
      ? lesson.assignedAt.toLocaleDateString("ru-RU")
      : null,
  };
}
