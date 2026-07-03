import { Prisma, Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { canStudentAccessOlympiad, getOlympiadPhase, shuffleTaskIds } from "@/lib/olympiads";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";

/** Старт попытки: дедлайн = min(старт + время, закрытие олимпиады). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const olympiadId = parseEntityId(id);

  if (!user || user.role !== Role.STUDENT) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (olympiadId === null) {
    return NextResponse.json({ error: "Олимпиада не найдена." }, { status: 404 });
  }

  const olympiad = await prisma.olympiad.findUnique({
    where: { id: olympiadId },
    include: { tasks: { orderBy: { position: "asc" } } },
  });

  if (!olympiad || !(await canStudentAccessOlympiad(olympiadId, user.id))) {
    return NextResponse.json({ error: "Олимпиада не найдена." }, { status: 404 });
  }

  const backTo = `/olympiads/${olympiadId}`;
  const phase = getOlympiadPhase(olympiad);

  if (phase === "upcoming") {
    return redirectWithError(request, backTo, "Олимпиада ещё не открыта.");
  }

  if (phase === "closed") {
    return redirectWithError(request, backTo, "Олимпиада уже завершена.");
  }

  const orderedTaskIds = olympiad.tasks.map((item) => item.taskId);
  const taskOrder = olympiad.shuffleTasks ? shuffleTaskIds(orderedTaskIds) : orderedTaskIds;
  const expiresAt = new Date(
    Math.min(Date.now() + olympiad.durationMinutes * 60 * 1000, olympiad.closesAt.getTime()),
  );

  try {
    await prisma.olympiadAttempt.create({
      data: {
        olympiadId,
        studentId: user.id,
        expiresAt,
        taskOrder: JSON.stringify(taskOrder),
      },
    });
  } catch (error) {
    // P2002 — попытка уже есть (одна на участника): просто открываем её.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      throw error;
    }
  }

  return redirectAfterPost(request, `/olympiads/${olympiadId}/take`);
}
