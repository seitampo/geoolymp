import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { parseOlympiadDuration } from "@/lib/olympiads";
import { prisma } from "@/lib/prisma";
import { parseOptionalDeadline } from "@/lib/tasks";
import { isTrainingSupportedTaskType } from "@/lib/training";

/** Создание олимпиады: задачи из библиотеки учителя + назначение группам. */
export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);

  if (!user || user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  const backTo = "/olympiads/new";
  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const durationMinutes = parseOlympiadDuration(String(formData.get("durationMinutes") ?? ""));
  const opensAt = parseOptionalDeadline(String(formData.get("opensAt") ?? ""));
  const closesAt = parseOptionalDeadline(String(formData.get("closesAt") ?? ""));
  const shuffleTasks = String(formData.get("shuffleTasks") ?? "") === "on";
  const taskIds = [...new Set(formData.getAll("taskIds").map((value) => Number(value)))].filter(
    (value) => Number.isInteger(value) && value > 0,
  );
  const groupIds = [...new Set(formData.getAll("groupIds").map((value) => Number(value)))].filter(
    (value) => Number.isInteger(value) && value > 0,
  );

  if (!title || !description) {
    return redirectWithError(request, backTo, "Заполните название и описание олимпиады.");
  }

  if (durationMinutes === undefined) {
    return redirectWithError(request, backTo, "Общее время — целое число минут от 1 до 600.");
  }

  if (!opensAt || !closesAt || opensAt === undefined || closesAt === undefined) {
    return redirectWithError(request, backTo, "Укажите даты открытия и закрытия.");
  }

  if (opensAt >= closesAt) {
    return redirectWithError(request, backTo, "Дата открытия должна быть раньше даты закрытия.");
  }

  if (taskIds.length === 0) {
    return redirectWithError(request, backTo, "Выберите хотя бы одну задачу.");
  }

  if (groupIds.length === 0) {
    return redirectWithError(request, backTo, "Выберите хотя бы одну группу.");
  }

  // Задачи — только свои и только поддерживаемых типов (текст и варианты).
  const tasks = await prisma.task.findMany({
    where: { id: { in: taskIds }, group: { teacherId: user.id } },
  });
  if (tasks.length !== taskIds.length || tasks.some((task) => !isTrainingSupportedTaskType(task.type))) {
    return redirectWithError(request, backTo, "Некоторые задачи недоступны для олимпиады.");
  }

  const groupsCount = await prisma.group.count({
    where: { id: { in: groupIds }, teacherId: user.id },
  });
  if (groupsCount !== groupIds.length) {
    return redirectWithError(request, backTo, "Некоторые группы не найдены.");
  }

  const olympiad = await prisma.olympiad.create({
    data: {
      teacherId: user.id,
      title,
      description,
      durationMinutes,
      opensAt,
      closesAt,
      shuffleTasks,
      tasks: {
        create: taskIds.map((taskId, index) => ({ taskId, position: index + 1 })),
      },
      groups: {
        create: groupIds.map((groupId) => ({ groupId })),
      },
    },
  });

  return redirectAfterPost(request, `/olympiads/${olympiad.id}`);
}
