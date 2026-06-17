import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const groupId = Number(id);

  if (!user || user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  const group = await prisma.group.findUnique({ where: { id: groupId } });

  if (!group || group.teacherId !== user.id) {
    return NextResponse.json({ error: "Группа не найдена." }, { status: 404 });
  }

  await prisma.group.delete({ where: { id: groupId } });

  return NextResponse.redirect(new URL("/dashboard", request.url), 303);
}
