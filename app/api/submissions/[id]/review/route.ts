import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const submissionId = Number(id);

  if (!user || user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { task: { include: { group: true } } },
  });

  if (!submission || submission.task.group.teacherId !== user.id) {
    return NextResponse.json({ error: "Решение не найдено." }, { status: 404 });
  }

  const formData = await request.formData();
  const score = Number(formData.get("score"));
  const feedback = String(formData.get("feedback") ?? "").trim();

  if (!Number.isInteger(score) || score < 0 || score > submission.task.maxScore) {
    return NextResponse.json({ error: "Балл должен быть в пределах максимального балла." }, { status: 400 });
  }

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: "REVIEWED",
      review: {
        upsert: {
          update: { score, feedback },
          create: { score, feedback },
        },
      },
    },
  });

  return NextResponse.redirect(new URL(`/groups/${submission.task.groupId}?tab=submissions`, request.url), 303);
}
