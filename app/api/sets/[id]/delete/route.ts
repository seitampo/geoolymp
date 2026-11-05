import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithSuccess } from "@/lib/formResponse";
import { getT } from "@/lib/i18n";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const t = await getT();
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const setId = parseEntityId(id);

  if (!user || user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (setId === null) {
    return NextResponse.json(
      { error: "Подборка не найдена." },
      { status: 404 },
    );
  }

  const set = await prisma.taskSet.findUnique({
    where: { id: setId },
    include: { group: true },
  });
  if (!set || set.group.teacherId !== user.id) {
    return NextResponse.json(
      { error: "Подборка не найдена." },
      { status: 404 },
    );
  }

  // Keep reusable questions and submissions; removed new lessons must not expose
  // their questions as standalone practice.
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "TaskSet" WHERE id = ${setId} FOR UPDATE`;
    const current = await tx.taskSet.findUnique({
      where: { id: setId },
      include: { items: true },
    });
    if (!current) return;
    await tx.taskSet.delete({ where: { id: setId } });
    if (current.assignedAt || !current.isPublished)
      await tx.task.updateMany({
        where: {
          id: { in: current.items.map((item) => item.taskId) },
          setItems: { none: { set: { isPublished: true } } },
        },
        data: { isPublished: false },
      });
  });

  return redirectWithSuccess(
    request,
    `/groups/${set.groupId}?tab=sets`,
    t("ok.setDeleted"),
  );
}
