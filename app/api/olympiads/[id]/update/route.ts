import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { parseOlympiadDuration } from "@/lib/olympiads";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { parseOptionalDeadline } from "@/lib/tasks";

/** Правка основных полей олимпиады (состав задач и групп фиксируется при создании). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const olympiadId = parseEntityId(id);

  if (!user || user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (olympiadId === null) {
    return NextResponse.json({ error: "Олимпиада не найдена." }, { status: 404 });
  }

  const olympiad = await prisma.olympiad.findUnique({ where: { id: olympiadId } });
  if (!olympiad || olympiad.teacherId !== user.id) {
    return NextResponse.json({ error: "Олимпиада не найдена." }, { status: 404 });
  }

  const backTo = `/olympiads/${olympiadId}`;
  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const durationMinutes = parseOlympiadDuration(String(formData.get("durationMinutes") ?? ""));
  const opensAt = parseOptionalDeadline(String(formData.get("opensAt") ?? ""));
  const closesAt = parseOptionalDeadline(String(formData.get("closesAt") ?? ""));
  const shuffleTasks = String(formData.get("shuffleTasks") ?? "") === "on";

  if (!title || !description) {
    return redirectWithError(request, backTo, "Заполните название и описание олимпиады.");
  }

  if (durationMinutes === undefined) {
    return redirectWithError(request, backTo, "Общее время — целое число минут от 1 до 600.");
  }

  if (!opensAt || !closesAt) {
    return redirectWithError(request, backTo, "Укажите даты открытия и закрытия.");
  }

  if (opensAt >= closesAt) {
    return redirectWithError(request, backTo, "Дата открытия должна быть раньше даты закрытия.");
  }

  await prisma.olympiad.update({
    where: { id: olympiadId },
    data: { title, description, durationMinutes, opensAt, closesAt, shuffleTasks },
  });

  return redirectAfterPost(request, backTo);
}
