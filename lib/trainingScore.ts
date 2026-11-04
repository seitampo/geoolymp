export function trainingScore(
  tasks: { id: number; maxScore: number }[],
  answers: { taskId: number; score: number }[],
) {
  const byTask = new Map(
    answers.map((answer) => [answer.taskId, answer.score]),
  );
  return {
    possibleScore: tasks.reduce((sum, task) => sum + task.maxScore, 0),
    earnedScore: tasks.reduce(
      (sum, task) =>
        sum + Math.min(task.maxScore, Math.max(0, byTask.get(task.id) ?? 0)),
      0,
    ),
  };
}
