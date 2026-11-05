import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { canOpenGroup } from "@/lib/permissions";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { isTaskIssued } from "@/lib/lessonAccess";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUserFromRequest(request);
  if (!user || user.role !== "STUDENT")
    return NextResponse.json({ ok: false }, { status: 403 });
  const taskId = parseEntityId((await params).id);
  if (taskId === null) return NextResponse.json({ ok: false }, { status: 404 });
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { groupId: true },
  });
  if (user.role === "STUDENT" && !(await isTaskIssued(taskId)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!task || !(await canOpenGroup(user.id, task.groupId)))
    return NextResponse.json({ ok: false }, { status: 404 });
  await prisma.review.updateMany({
    where: {
      seenByStudentAt: null,
      submission: { taskId, studentId: user.id },
    },
    data: { seenByStudentAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
