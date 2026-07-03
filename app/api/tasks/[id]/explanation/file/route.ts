import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { parseEntityId } from "@/lib/params";
import { canOpenGroup } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { contentDisposition, getAbsoluteUploadPath } from "@/lib/uploads";

export const runtime = "nodejs";

/**
 * Файл разбора. Учителю группы доступен всегда; ученику — только после того,
 * как его собственное решение этой задачи проверено (разбор не должен
 * подсказывать до сдачи).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const taskId = parseEntityId(id);

  if (!user) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (taskId === null) {
    return NextResponse.json({ error: "Разбор не найден." }, { status: 404 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { group: true } });
  if (!task || !task.explanationFilePath || !(await canOpenGroup(user.id, task.groupId))) {
    return NextResponse.json({ error: "Разбор не найден." }, { status: 404 });
  }

  if (task.group.teacherId !== user.id) {
    const submission = await prisma.submission.findUnique({
      where: { taskId_studentId: { taskId, studentId: user.id } },
    });

    if (!submission || submission.status !== "REVIEWED") {
      return NextResponse.json({ error: "Разбор не найден." }, { status: 404 });
    }
  }

  const file = await readFile(getAbsoluteUploadPath(task.explanationFilePath));

  return new NextResponse(file, {
    headers: {
      "Content-Type": getExplanationContentType(task.explanationFileName ?? ""),
      "Content-Disposition": contentDisposition("inline", task.explanationFileName ?? "explanation"),
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function getExplanationContentType(fileName: string) {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith(".pdf")) return "application/pdf";
  if (lowerName.endsWith(".png")) return "image/png";
  if (lowerName.endsWith(".webp")) return "image/webp";
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg";

  return "application/octet-stream";
}
