import { Prisma, Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { getT } from "@/lib/i18n";
import { parseEntityId } from "@/lib/params";
import { canOpenGroup } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { isTaskVisibleToStudents } from "@/lib/tasks";
import { isTrainingSupportedTaskType } from "@/lib/training";

/** Старт тренировки: создаёт единственную попытку и фиксирует дедлайн. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const setId = parseEntityId(id);

  if (!user || user.role !== Role.STUDENT) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (setId === null) {
    return NextResponse.json({ error: "Подборка не найдена." }, { status: 404 });
  }

  const set = await prisma.taskSet.findUnique({
    where: { id: setId },
    include: { items: { include: { task: true } } },
  });

  if (!set || !(await canOpenGroup(user.id, set.groupId))) {
    return NextResponse.json({ error: "Подборка не найдена." }, { status: 404 });
  }

  const backTo = `/groups/${set.groupId}/sets/${set.id}`;
  const trainingTo = `/groups/${set.groupId}/sets/${set.id}/training`;

  if (!set.trainingMinutes) {
    return redirectWithError(request, backTo, t("err.trainingNotConfigured"));
  }

  const trainableTasks = set.items.filter(
    (item) => isTaskVisibleToStudents(item.task) && isTrainingSupportedTaskType(item.task.type),
  );

  if (trainableTasks.length === 0) {
    return redirectWithError(request, backTo, t("err.trainingNoTasks"));
  }

  try {
    await prisma.trainingAttempt.create({
      data: {
        setId: set.id,
        studentId: user.id,
        expiresAt: new Date(Date.now() + set.trainingMinutes * 60 * 1000),
      },
    });
  } catch (error) {
    // P2002 — попытка уже существует («одна попытка»): просто открываем её.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      throw error;
    }
  }

  return redirectAfterPost(request, trainingTo);
}
