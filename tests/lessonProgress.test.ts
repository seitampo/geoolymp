import assert from "node:assert/strict";
import test from "node:test";
import { lessonProgress } from "../lib/lessonProgress";
test("lesson completion counts submitted questions while keeping grades and pending checks separate", () => {
  const progress = lessonProgress(
    [
      {
        task: {
          maxScore: 10,
          submissions: [
            { studentId: 1, status: "REVIEWED", review: { score: 5 } },
            { studentId: 2, status: "PENDING", review: null },
          ],
        },
      },
      {
        task: {
          maxScore: 5,
          submissions: [
            { studentId: 1, status: "REVIEWED", review: { score: 5 } },
          ],
        },
      },
    ],
    [1, 2, 3],
  );
  assert.equal(progress.completed, 1);
  assert.equal(progress.pending, 1);
  assert.deepEqual(
    progress.members.map((row) => [
      row.submitted,
      row.solved,
      row.score,
      row.complete,
    ]),
    [
      [2, 1, 10, true],
      [1, 0, 0, false],
      [0, 0, 0, false],
    ],
  );
  assert.equal(lessonProgress([], [1]).completed, 0);
});
