import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { contentDisposition, readUploadedFile } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const submissionId = parseEntityId(id);

  if (!user) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (submissionId === null) {
    return NextResponse.json({ error: "Файл не найден." }, { status: 404 });
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { task: { include: { group: true } } },
  });

  if (!submission || !submission.filePath) {
    return NextResponse.json({ error: "Файл не найден." }, { status: 404 });
  }

  // Решение — приватная работа ученика. Файл доступен только автору решения и
  // учителю группы. Проверки «состоит в группе» недостаточно: иначе любой
  // одногруппник скачал бы чужую работу, перебирая id решений.
  const isGroupTeacher = submission.task.group.teacherId === user.id;
  const isOwner = submission.studentId === user.id;
  if (!isGroupTeacher && !isOwner) {
    return NextResponse.json({ error: "Файл не найден." }, { status: 404 });
  }

  const file = await readUploadedFile(submission.filePath);
  if (!file) {
    return NextResponse.json({ error: "Файл не найден." }, { status: 404 });
  }

  return new NextResponse(file, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": contentDisposition("attachment", submission.originalFileName ?? "submission"),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
