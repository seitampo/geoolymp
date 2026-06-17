import { Role } from "@prisma/client";
import { unlink } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { canOpenGroup } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { normalizeMultipleChoiceAnswer } from "@/lib/tasks";
import { getAbsoluteUploadPath, saveUploadedFile } from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const taskId = Number(id);

  if (!user || user.role !== Role.STUDENT) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || !(await canOpenGroup(user.id, task.groupId))) {
    return NextResponse.json({ error: "Задача не найдена." }, { status: 404 });
  }

  const formData = await request.formData();
  const selectedAnswers = formData.getAll("answer").map((value) => String(value));
  const answer =
    task.type === "MULTIPLE_CHOICE"
      ? normalizeMultipleChoiceAnswer(selectedAnswers)
      : String(formData.get("answer") ?? "").trim();
  const file = formData.get("file");
  const savedFile = file instanceof File && file.size > 0 ? await saveUploadedFile(file, "submissions") : null;
  const oldSubmission = await prisma.submission.findUnique({
    where: { taskId_studentId: { taskId, studentId: user.id } },
  });

  if (!answer && !savedFile && !oldSubmission?.filePath) {
    return NextResponse.json({ error: "Добавьте ответ или файл." }, { status: 400 });
  }

  // Если ученик отправляет ответ повторно, старая проверка больше не актуальна.
  await prisma.$transaction(async (transaction) => {
    if (oldSubmission) {
      await transaction.review.deleteMany({ where: { submissionId: oldSubmission.id } });
    }

    await transaction.submission.upsert({
      where: { taskId_studentId: { taskId, studentId: user.id } },
      update: {
        answer,
        status: "PENDING",
        filePath: savedFile?.filePath ?? oldSubmission?.filePath,
        originalFileName: savedFile?.originalFileName ?? oldSubmission?.originalFileName,
      },
      create: {
        taskId,
        studentId: user.id,
        answer,
        filePath: savedFile?.filePath,
        originalFileName: savedFile?.originalFileName,
      },
    });

    if (savedFile && oldSubmission?.filePath) {
      await unlink(getAbsoluteUploadPath(oldSubmission.filePath)).catch(() => undefined);
    }
  });

  return NextResponse.redirect(new URL(`/groups/${task.groupId}?tab=tasks`, request.url), 303);
}
