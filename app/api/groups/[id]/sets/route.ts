import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { parseTrainingMinutes } from "@/lib/training";

/** Создание подборки задач в группе. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const groupId = parseEntityId(id);

  if (!user || user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (groupId === null) {
    return NextResponse.json({ error: "Группа не найдена." }, { status: 404 });
  }

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group || group.teacherId !== user.id) {
    return NextResponse.json({ error: "Группа не найдена." }, { status: 404 });
  }

  const backTo = `/groups/${groupId}?tab=sets`;
  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const trainingMinutes = parseTrainingMinutes(String(formData.get("trainingMinutes") ?? ""));

  if (!title || !description) {
    return redirectWithError(request, backTo, "Заполните название и описание подборки.");
  }

  if (trainingMinutes === undefined) {
    return redirectWithError(request, backTo, "Лимит тренировки — целое число минут от 1 до 600.");
  }

  const set = await prisma.taskSet.create({ data: { groupId, title, description, trainingMinutes } });

  return redirectAfterPost(request, `/groups/${groupId}/sets/${set.id}`);
}
