import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost } from "@/lib/formResponse";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const membershipId = parseEntityId(id);

  if (!user || user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (membershipId === null) {
    return NextResponse.json({ error: "Участник не найден." }, { status: 404 });
  }

  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: { group: true },
  });

  if (!membership || membership.group.teacherId !== user.id) {
    return NextResponse.json({ error: "Участник не найден." }, { status: 404 });
  }

  // Удаляем ученика из группы и очищаем его решения и отметки материалов в этой группе,
  // чтобы вкладки "Решения" и "Участники" не показывали старые данные удаленного участника.
  await prisma.$transaction(async (transaction) => {
    await transaction.materialView.deleteMany({
      where: {
        userId: membership.userId,
        material: { groupId: membership.groupId },
      },
    });

    await transaction.review.deleteMany({
      where: {
        submission: {
          studentId: membership.userId,
          task: { groupId: membership.groupId },
        },
      },
    });

    await transaction.submission.deleteMany({
      where: {
        studentId: membership.userId,
        task: { groupId: membership.groupId },
      },
    });

    await transaction.membership.delete({ where: { id: membership.id } });
  });

  return redirectAfterPost(request, `/groups/${membership.groupId}?tab=members`);
}
