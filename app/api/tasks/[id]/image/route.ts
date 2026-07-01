import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { canOpenGroup } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getAbsoluteUploadPath } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const taskId = Number(id);

  if (!user) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || !task.imagePath || !(await canOpenGroup(user.id, task.groupId))) {
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
