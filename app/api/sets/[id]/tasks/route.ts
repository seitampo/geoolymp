import { Prisma, Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";

/** Добавление задачи группы в подборку (в конец, по порядку добавления). */
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
    return redirectWithError(request, backTo, "Выберите задачу.");
  }

  // Только задачи этой же группы: у подборки и задач общая аудитория учеников.
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.groupId !== set.groupId) {
    return redirectWithError(request, backTo, "Задача не найдена в этой группе.");
  }

  try {
    const position = await prisma.taskSetItem.count({ where: { setId } });
    await prisma.taskSetItem.create({ data: { setId, taskId, position: position + 1 } });
  } catch (error) {
    // P2002 — нарушение уникальности (setId, taskId): задача уже в подборке.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return redirectWithError(request, backTo, "Эта задача уже есть в подборке.");
    }
    throw error;
  }

  return redirectAfterPost(request, backTo);
}
