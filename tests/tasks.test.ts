import assert from "node:assert/strict";
import test from "node:test";
import { studentTaskStatus } from "../lib/taskStatus";
import {
  parseMapPoint,
  scoreMultipleChoice,
  isAnswerCorrect,
} from "../lib/tasks";
import { validateTrainingAnswer } from "../lib/trainingAnswers";
import { canonicalAnswer } from "../lib/answerValue";
import { trainingScore } from "../lib/trainingScore";

test("zero and partial scores do not count as fully solved", () => {
  assert.equal(studentTaskStatus(null, 10), "not-submitted");
  assert.equal(
    studentTaskStatus({ status: "PENDING", review: null }, 10),
    "pending",
  );
  assert.equal(
    studentTaskStatus({ status: "REVIEWED", review: { score: 0 } }, 10),
    "wrong",
  );
  assert.equal(
    studentTaskStatus({ status: "REVIEWED", review: { score: 9 } }, 10),
    "partial",
  );
  assert.equal(
    studentTaskStatus({ status: "REVIEWED", review: { score: 10 } }, 10),
    "solved",
  );
});

test("multiple-choice scoring never awards full credit to an incomplete answer", () => {
  assert.equal(scoreMultipleChoice("A; B", "A; B", 5).score, 5);
  assert.equal(scoreMultipleChoice("A", "A; B", 5).score, 3);
  assert.equal(scoreMultipleChoice("A; C", "A; B", 5).score, 0);
  assert.equal(scoreMultipleChoice("A", "A; B", 1).score, 0);
  assert.equal(isAnswerCorrect("MULTIPLE_CHOICE", "B; A", "A; B"), true);
});

test("blank or out-of-range map coordinates cannot be accepted", () => {
  for (const value of [
    ";",
    "1;",
    ";2",
    "-1;2",
    "101;2",
    "1;301",
    "NaN;2",
    "1;2;3",
  ])
    assert.equal(parseMapPoint(value), null);
  assert.deepEqual(parseMapPoint("20.5;160"), { x: 20.5, y: 160 });
});

test("autosave validates variants, normalizes multiple answers and allows clearing", () => {
  assert.deepEqual(
    validateTrainingAnswer(
      { type: "MULTIPLE_CHOICE", options: "A\nB" },
      " B; A; A ",
    ),
    { answer: "A; B" },
  );
  assert.ok(
    "error" in
      validateTrainingAnswer({ type: "SINGLE_CHOICE", options: "A\nB" }, "C"),
  );
  assert.deepEqual(
    validateTrainingAnswer({ type: "TEXT", options: null }, ""),
    { answer: "" },
  );
  assert.ok(
    "error" in
      validateTrainingAnswer({ type: "MAP_POINT", options: null }, ";"),
  );
});

test("a normalized server answer does not discard a newer local draft", () => {
  assert.equal(
    canonicalAnswer("TEXT", "Initial answer  "),
    canonicalAnswer("TEXT", "Initial answer"),
  );
  assert.equal(
    canonicalAnswer("MULTIPLE_CHOICE", "B; A; A"),
    canonicalAnswer("MULTIPLE_CHOICE", "A; B"),
  );
  assert.notEqual(
    canonicalAnswer("TEXT", "Newer draft"),
    canonicalAnswer("TEXT", "Initial answer"),
  );
});

test("contest totals include manually graded text and exclude unrelated answers", () => {
  assert.deepEqual(
    trainingScore(
      [
        { id: 1, maxScore: 5 },
        { id: 2, maxScore: 10 },
      ],
      [
        { taskId: 1, score: 5 },
        { taskId: 2, score: 7 },
        { taskId: 99, score: 100 },
      ],
    ),
    { possibleScore: 15, earnedScore: 12 },
  );
});
