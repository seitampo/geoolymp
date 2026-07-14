import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { getT } from "@/lib/i18n";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { parseTrainingMinutes } from "@/lib/training";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
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
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const trainingMinutes = parseTrainingMinutes(String(formData.get("trainingMinutes") ?? ""));

  if (!title || !description) {
    return redirectWithError(request, backTo, t("err.setFields"));
  }

  if (trainingMinutes === undefined) {
    return redirectWithError(request, backTo, t("err.trainingLimit"));
  }

  await prisma.taskSet.update({ where: { id: setId }, data: { title, description, trainingMinutes } });

  return redirectAfterPost(request, backTo);
}
