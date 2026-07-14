import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithSuccess } from "@/lib/formResponse";
import { getT } from "@/lib/i18n";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";

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

  // Удаляется только подборка (items каскадом); сами задачи остаются в группе.
  await prisma.taskSet.delete({ where: { id: setId } });

  return redirectWithSuccess(request, `/groups/${set.groupId}?tab=sets`, t("ok.setDeleted"));
}
