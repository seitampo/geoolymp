import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost } from "@/lib/formResponse";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";

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

  // Каскадом удаляются связи, попытки и ответы; сами задачи остаются в группах.
  await prisma.olympiad.delete({ where: { id: olympiadId } });

  return redirectAfterPost(request, "/dashboard");
}
