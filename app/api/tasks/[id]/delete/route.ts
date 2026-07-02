import { Role } from "@prisma/client";
import { unlink } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost } from "@/lib/formResponse";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { getAbsoluteUploadPath } from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const taskId = parseEntityId(id);

  if (!user || user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (taskId === null) {
    return NextResponse.json({ error: "Задача не найдена." }, { status: 404 });
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      group: true,
      submissions: true,
    },
  });

  if (!task || task.group.teacherId !== user.id) {
    return NextResponse.json({ error: "Задача не найдена." }, { status: 404 });
  }

  await prisma.task.delete({ where: { id: taskId } });

  if (task.imagePath) {
    await unlink(getAbsoluteUploadPath(task.imagePath)).catch(() => undefined);
  }

  for (const submission of task.submissions) {
    if (submission.filePath) {
      await unlink(getAbsoluteUploadPath(submission.filePath)).catch(() => undefined);
    }
  }

  return redirectAfterPost(request, `/groups/${task.groupId}?tab=tasks`);
}
