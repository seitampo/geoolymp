import { Role, Submission } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { isTaskVisibleToStudents } from "@/lib/tasks";
import { getTrainingTaskIds } from "@/lib/training";
import { contentDisposition } from "@/lib/uploads";

export const runtime = "nodejs";

/**
 * Экспорт результатов группы в CSV: строка на каждую пару «ученик × задача»
 * (включая неотправленные), чтобы таблица сразу показывала пробелы.
 * Разделитель «;» и BOM — чтобы русский Excel открывал файл без настройки.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const groupId = parseEntityId(id);

  if (!user || user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (groupId === null) {
    return NextResponse.json({ error: "Группа не найдена." }, { status: 404 });
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      memberships: { include: { user: true }, orderBy: { user: { name: "asc" } } },
      tasks: { orderBy: { id: "asc" } },
    },
  });

  if (!group || group.teacherId !== user.id) {
    return NextResponse.json({ error: "Группа не найдена." }, { status: 404 });
  }

  const submissions = await prisma.submission.findMany({
    where: { task: { groupId } },
    include: { review: true },
  });
  const submissionByKey = new Map<string, (typeof submissions)[number]>(
    submissions.map((submission) => [submissionKey(submission), submission]),
  );

  // Черновики и тренировочные задачи не экспортируем: обычных решений по ним нет,
  // строки только шумят (результаты тренировок — на странице подборки).
  const trainingTaskIds = await getTrainingTaskIds(groupId);
  const visibleTasks = group.tasks.filter(
    (task) => isTaskVisibleToStudents(task) && !trainingTaskIds.has(task.id),
  );

  const rows: string[][] = [["Ученик", "Email", "Задача", "Статус", "Балл", "Макс. балл"]];

  for (const membership of group.memberships) {
    for (const task of visibleTasks) {
      const submission = submissionByKey.get(`${task.id}:${membership.userId}`);
      const status = !submission
        ? "Не отправлено"
        : submission.status === "REVIEWED"
          ? "Проверено"
          : "На проверке";

      rows.push([
        membership.user.name,
        membership.user.email,
        task.title,
        status,
        submission?.review ? String(submission.review.score) : "",
        String(task.maxScore),
      ]);
    }
  }

  const csv = "﻿" + rows.map((row) => row.map(escapeCsvField).join(";")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": contentDisposition("attachment", `Результаты — ${group.name}.csv`),
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function submissionKey(submission: Pick<Submission, "taskId" | "studentId">) {
  return `${submission.taskId}:${submission.studentId}`;
}

function escapeCsvField(value: string) {
  if (/[";\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
