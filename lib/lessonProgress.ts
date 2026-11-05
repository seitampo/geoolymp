import { studentTaskStatus } from "./taskStatus";

export type LessonProgressItem = {
  task: {
    maxScore: number;
    submissions: {
      studentId: number;
      status: string;
      review: { score: number } | null;
    }[];
  };
};
export function lessonProgress(
  items: LessonProgressItem[],
  studentIds: number[],
) {
  const total = items.length;
  const members = studentIds.map((studentId) => {
    const submissions = items.map((item) =>
      item.task.submissions.find(
        (submission) => submission.studentId === studentId,
      ),
    );
    return {
      studentId,
      submitted: submissions.filter(Boolean).length,
      solved: items.filter(
        (item, i) =>
          studentTaskStatus(submissions[i], item.task.maxScore) === "solved",
      ).length,
      pending: submissions.filter(
        (submission) => submission?.status === "PENDING",
      ).length,
      complete: total > 0 && submissions.every(Boolean),
      score: submissions.reduce(
        (sum, submission) => sum + (submission?.review?.score ?? 0),
        0,
      ),
    };
  });
  return {
    total,
    members,
    completed: members.filter((member) => member.complete).length,
    pending: members.reduce((sum, member) => sum + member.pending, 0),
  };
}
