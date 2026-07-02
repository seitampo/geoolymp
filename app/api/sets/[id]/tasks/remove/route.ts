import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";

/** Убрать задачу из подборки (сама задача в группе остаётся). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const setId = parseEntityId(id);

  if (!user || user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (setId === null) {
    return NextResponse.json({ error: "Подборка не найдена." }, { status: 404 });
  }

  const set = await prisma.taskSet.findUnique({ where: { id: setId }, include: { group: true } });
  if (!set || set.group.teacherId !== user.id) {
    return NextResponse.json({ error: "Подборка не найдена." }, { status: 404 });
  }

  const backTo = `/groups/${set.groupId}/sets/${set.id}`;
  const formData = await request.formData();
  const taskId = parseEntityId(String(formData.get("taskId") ?? ""));

  if (taskId === null) {
    return redirectWithError(request, backTo, "Задача не найдена.");
  }

  await prisma.taskSetItem.deleteMany({ where: { setId, taskId } });

  return redirectAfterPost(request, backTo);
}
