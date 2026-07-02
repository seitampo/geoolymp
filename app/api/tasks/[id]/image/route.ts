import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { parseEntityId } from "@/lib/params";
import { canOpenGroup } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { isTaskVisibleToStudents } from "@/lib/tasks";
import { getAbsoluteUploadPath } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const taskId = parseEntityId(id);

  if (!user) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (taskId === null) {
    return NextResponse.json({ error: "Изображение не найдено." }, { status: 404 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { group: true } });
  if (!task || !task.imagePath || !(await canOpenGroup(user.id, task.groupId))) {
    return NextResponse.json({ error: "Изображение не найдено." }, { status: 404 });
  }

  // Изображение черновика доступно только учителю группы.
  if (task.group.teacherId !== user.id && !isTaskVisibleToStudents(task)) {
    return NextResponse.json({ error: "Изображение не найдено." }, { status: 404 });
  }

  const image = await readFile(getAbsoluteUploadPath(task.imagePath));

  return new NextResponse(image, {
    headers: {
      "Content-Type": getImageContentType(task.originalImageName ?? ""),
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function getImageContentType(fileName: string) {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith(".png")) return "image/png";
  if (lowerName.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}
