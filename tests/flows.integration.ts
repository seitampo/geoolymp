import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";

test("teacher and student workflows against an isolated local database", async (t) => {
  const db = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(
    ["localhost", "127.0.0.1"].includes(db.hostname) && db.port === "51224",
    "Integration tests require the local QA database on port 51224",
  );
  const base = process.env.GEOOLYMP_TEST_BASE_URL ?? "http://localhost:3000";
  assert.equal(new URL(base).hostname, "localhost");
  const prisma = new PrismaClient();
  const suffix = Date.now();
  const password = "integration-qa-password";
  async function account(role: "TEACHER" | "STUDENT", label: string) {
    const user = await prisma.user.create({
      data: {
        email: label + suffix + "@example.test",
        name: label,
        password: await hashPassword(password),
        role,
        emailVerified: true,
      },
    });
    const form = new FormData();
    form.set("email", user.email);
    form.set("password", password);
    const response = await fetch(base + "/api/auth/login", {
      method: "POST",
      body: form,
      redirect: "manual",
      headers: { Accept: "application/json" },
    });
    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie);
    return { user, cookie };
  }
  async function post(
    path: string,
    cookie: string,
    data: FormData | object = new FormData(),
  ) {
    const json = !(data instanceof FormData);
    const response = await fetch(base + path, {
      method: "POST",
      redirect: "manual",
      body: json ? JSON.stringify(data) : (data as FormData),
      headers: {
        Cookie: cookie,
        Accept: "application/json",
        ...(json ? { "Content-Type": "application/json" } : {}),
      },
    });
    return { status: response.status, body: await response.json() };
  }
  function form(values: Record<string, string | string[]>) {
    const data = new FormData();
    for (const [key, value] of Object.entries(values))
      for (const item of Array.isArray(value) ? value : [value])
        data.append(key, item);
    return data;
  }
  try {
    const teacher = await account("TEACHER", "teacher");
    const student = await account("STUDENT", "student");
    const outsider = await account("STUDENT", "outsider");
    const group = await prisma.group.create({
      data: {
        name: "API QA",
        description: "Local disposable fixture",
        inviteCode: "QA-" + suffix,
        teacherId: teacher.user.id,
        memberships: { create: { userId: student.user.id } },
      },
    });
    const single = await prisma.task.create({
      data: {
        groupId: group.id,
        title: "Single",
        description: "Pick A",
        type: "SINGLE_CHOICE",
        options: "A\nB",
        correctAnswer: "A",
        maxScore: 5,
      },
    });
    const multiple = await prisma.task.create({
      data: {
        groupId: group.id,
        title: "Multiple",
        description: "Pick A and B",
        type: "MULTIPLE_CHOICE",
        options: "A\nB\nC",
        correctAnswer: "A; B",
        maxScore: 10,
      },
    });
    const set = await prisma.taskSet.create({
      data: { groupId: group.id, title: "Practice", description: "QA" },
    });
    await t.test(
      "bulk adding and reordering preserve the requested order",
      async () => {
        assert.equal(
          (
            await post(
              "/api/sets/" + set.id + "/tasks",
              teacher.cookie,
              form({ taskId: [String(single.id), String(multiple.id)] }),
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await post(
              "/api/sets/" + set.id + "/tasks",
              teacher.cookie,
              form({
                mode: "reorder",
                taskId: [String(multiple.id), String(single.id)],
              }),
            )
          ).status,
          200,
        );
        assert.deepEqual(
          (
            await prisma.taskSetItem.findMany({
              where: { setId: set.id },
              orderBy: { position: "asc" },
            })
          ).map((item) => item.taskId),
          [multiple.id, single.id],
        );
      },
    );
    await t.test(
      "a teacher creates a task and explanation directly inside a collection",
      async () => {
        const response = await post(
          "/api/groups/" + group.id + "/tasks",
          teacher.cookie,
          form({
            setId: String(set.id),
            title: "Direct create",
            description: "Choose",
            type: "SINGLE_CHOICE",
            options: "Yes\nNo",
            correctAnswer: "Yes",
            maxScore: "5",
            explanationText: "Explanation in the same form",
          }),
        );
        assert.equal(response.status, 200);
        const task = await prisma.task.findFirstOrThrow({
          where: { groupId: group.id, title: "Direct create" },
          include: { setItems: true },
        });
        assert.equal(task.explanationText, "Explanation in the same form");
        assert.equal(task.setItems[0].setId, set.id);
        const updated = await post(
          "/api/tasks/" + task.id + "/update",
          teacher.cookie,
          form({
            title: "Edited in collection",
            description: "Choose",
            type: "SINGLE_CHOICE",
            options: "Yes\nNo",
            correctAnswer: "Yes",
            maxScore: "5",
            explanationText: "Updated explanation",
            returnTo: "/groups/" + group.id + "/sets/" + set.id,
          }),
        );
        assert.equal(updated.status, 200);
        assert.equal(
          (await prisma.task.findUniqueOrThrow({ where: { id: task.id } }))
            .explanationText,
          "Updated explanation",
        );
        const invalid = await post(
          "/api/groups/" + group.id + "/tasks",
          teacher.cookie,
          form({
            title: "Invalid",
            description: "Choose",
            type: "SINGLE_CHOICE",
            options: "Same\nSame",
            correctAnswer: "Same",
            maxScore: "5",
          }),
        );
        assert.equal(invalid.status, 400);
      },
    );
    await t.test(
      "student permissions and group boundaries remain enforced",
      async () => {
        assert.equal(
          (
            await post(
              "/api/sets/" + set.id + "/tasks",
              student.cookie,
              form({ taskId: String(single.id) }),
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await post(
              "/api/tasks/" + single.id + "/submissions",
              outsider.cookie,
              form({ answer: "A" }),
            )
          ).status,
          404,
        );
      },
    );
    await t.test(
      "practice returns immediate results and allows correcting an answer",
      async () => {
        const wrong = await post(
          "/api/tasks/" + single.id + "/submissions",
          student.cookie,
          form({ answer: "B" }),
        );
        assert.equal(wrong.body.review.score, 0);
        const right = await post(
          "/api/tasks/" + single.id + "/submissions",
          student.cookie,
          form({ answer: "A" }),
        );
        assert.equal(right.body.review.score, 5);
        const partial = await post(
          "/api/tasks/" + multiple.id + "/submissions",
          student.cookie,
          form({ answer: ["A"] }),
        );
        assert.equal(partial.body.review.score, 5);
      },
    );
    await t.test(
      "opening one result leaves other notifications unread",
      async () => {
        assert.equal(
          (await post("/api/tasks/" + single.id + "/seen", outsider.cookie))
            .status,
          404,
        );
        assert.equal(
          (await post("/api/tasks/" + single.id + "/seen", student.cookie))
            .status,
          200,
        );
        const first = await prisma.submission.findUniqueOrThrow({
          where: {
            taskId_studentId: { taskId: single.id, studentId: student.user.id },
          },
          include: { review: true },
        });
        const second = await prisma.submission.findUniqueOrThrow({
          where: {
            taskId_studentId: {
              taskId: multiple.id,
              studentId: student.user.id,
            },
          },
          include: { review: true },
        });
        assert.ok(first.review?.seenByStudentAt);
        assert.equal(second.review?.seenByStudentAt, null);
      },
    );
    const timedTask = await prisma.task.create({
      data: {
        groupId: group.id,
        title: "Timed",
        description: "Pick A",
        type: "SINGLE_CHOICE",
        options: "A\nB",
        correctAnswer: "A",
        maxScore: 5,
      },
    });
    const textTask = await prisma.task.create({
      data: {
        groupId: group.id,
        title: "Timed text",
        description: "Explain",
        type: "TEXT",
        maxScore: 10,
      },
    });
    const timed = await prisma.taskSet.create({
      data: {
        groupId: group.id,
        title: "Timed QA",
        description: "QA",
        trainingMinutes: 30,
        items: {
          create: [
            { taskId: timedTask.id, position: 1 },
            { taskId: textTask.id, position: 2 },
          ],
        },
      },
    });
    assert.equal(
      (await post("/api/sets/" + timed.id + "/training/start", student.cookie))
        .status,
      200,
    );
    const attempt = await prisma.trainingAttempt.findUniqueOrThrow({
      where: {
        setId_studentId: { setId: timed.id, studentId: student.user.id },
      },
    });
    const answerPath = "/api/training/" + attempt.id + "/answers";
    await t.test(
      "autosave is atomic, supports clearing and rejects foreign tasks",
      async () => {
        assert.equal(
          (
            await post(answerPath, student.cookie, {
              answers: [
                { taskId: timedTask.id, answer: "B" },
                { taskId: textTask.id, answer: "Draft text" },
              ],
            })
          ).status,
          200,
        );
        const invalid = await post(answerPath, student.cookie, {
          answers: [
            { taskId: timedTask.id, answer: "A" },
            { taskId: single.id, answer: "A" },
          ],
        });
        assert.equal(invalid.status, 400);
        assert.equal(
          (
            await prisma.trainingAnswer.findUniqueOrThrow({
              where: {
                attemptId_taskId: {
                  attemptId: attempt.id,
                  taskId: timedTask.id,
                },
              },
            })
          ).answer,
          "B",
        );
        assert.equal(
          (
            await post(answerPath, student.cookie, {
              answers: [{ taskId: textTask.id, answer: "" }],
            })
          ).status,
          200,
        );
        assert.equal(
          await prisma.trainingAnswer.count({
            where: { attemptId: attempt.id, taskId: textTask.id },
          }),
          0,
        );
      },
    );
    await t.test("starting a contest freezes its task list", async () => {
      assert.equal(
        (
          await post(
            "/api/sets/" + set.id + "/tasks",
            teacher.cookie,
            form({ taskId: String(timedTask.id) }),
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await post(
            "/api/sets/" + timed.id + "/tasks",
            teacher.cookie,
            form({
              mode: "reorder",
              taskId: [String(textTask.id), String(timedTask.id)],
            }),
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await post(
            "/api/tasks/" + timedTask.id + "/update",
            teacher.cookie,
            form({
              title: "Changed",
              description: "Changed",
              type: "SINGLE_CHOICE",
              options: "A\nB",
              correctAnswer: "B",
              maxScore: "5",
            }),
          )
        ).status,
        400,
      );
    });
    await t.test(
      "finishing and simultaneous saving cannot corrupt a final score",
      async () => {
        await Promise.all([
          post(answerPath, student.cookie, {
            answers: [{ taskId: timedTask.id, answer: "A" }],
          }),
          post("/api/training/" + attempt.id + "/finish", student.cookie),
        ]);
        const completed = await prisma.trainingAttempt.findUniqueOrThrow({
          where: { id: attempt.id },
          include: { answers: true },
        });
        assert.ok(completed.finishedAt);
        const finalAnswer = completed.answers.find(
          (answer) => answer.taskId === timedTask.id,
        )!;
        assert.equal(finalAnswer.score, finalAnswer.answer === "A" ? 5 : 0);
        assert.equal(
          (
            await post(answerPath, student.cookie, {
              answers: [{ taskId: timedTask.id, answer: "B" }],
            })
          ).status,
          400,
        );
        assert.deepEqual(
          await prisma.trainingAnswer.findUnique({
            where: { id: finalAnswer.id },
          }),
          finalAnswer,
        );
        await post("/api/sets/" + timed.id + "/training/start", student.cookie);
        assert.equal(
          await prisma.trainingAttempt.count({
            where: { setId: timed.id, studentId: student.user.id },
          }),
          1,
        );
      },
    );
    await t.test(
      "the server finalizes expired attempts and refuses late answers",
      async () => {
        const expiredSet = await prisma.taskSet.create({
          data: {
            groupId: group.id,
            title: "Expired QA",
            description: "QA",
            trainingMinutes: 1,
            items: { create: { taskId: timedTask.id, position: 1 } },
          },
        });
        const deadline = new Date(Date.now() - 1000);
        const expired = await prisma.trainingAttempt.create({
          data: {
            setId: expiredSet.id,
            studentId: student.user.id,
            expiresAt: deadline,
            answers: { create: { taskId: timedTask.id, answer: "B" } },
          },
        });
        assert.equal(
          (
            await post(
              "/api/training/" + expired.id + "/answers",
              student.cookie,
              { answers: [{ taskId: timedTask.id, answer: "A" }] },
            )
          ).status,
          400,
        );
        const result = await prisma.trainingAttempt.findUniqueOrThrow({
          where: { id: expired.id },
          include: { answers: true },
        });
        assert.equal(result.finishedAt?.getTime(), deadline.getTime());
        assert.equal(result.answers[0].answer, "B");
        assert.equal(result.answers[0].score, 0);
      },
    );
  } finally {
    await prisma.$disconnect();
  }
});
