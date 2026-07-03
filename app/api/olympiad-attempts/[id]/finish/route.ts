import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost } from "@/lib/formResponse";
import { finalizeOlympiadAttempt } from "@/lib/olympiads";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";

/** Досрочное завершение попытки участником. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const attemptId = parseEntityId(id);

  if (!user || user.role !== Role.STUDENT) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (attemptId === null) {
    return NextResponse.json({ error: "Попытка не найдена." }, { status: 404 });
  }

  const attempt = await prisma.olympiadAttempt.findUnique({ where: { id: attemptId } });

  if (!attempt || attempt.studentId !== user.id) {
    return NextResponse.json({ error: "Попытка не найдена." }, { status: 404 });
  }

  await finalizeOlympiadAttempt(attempt.id);

  return redirectAfterPost(request, `/olympiads/${attempt.olympiadId}`);
}
