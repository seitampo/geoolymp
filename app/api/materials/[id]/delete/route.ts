import { Role } from "@prisma/client";
import { unlink } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { getAbsoluteMaterialPath } from "@/lib/materials";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const materialId = Number(id);

  if (!user || user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  const material = await prisma.material.findUnique({ where: { id: materialId }, include: { group: true } });
  if (!material || material.group.teacherId !== user.id) {
    return NextResponse.json({ error: "Материал не найден." }, { status: 404 });
  }

  await prisma.material.delete({ where: { id: materialId } });

  if (material.filePath) {
    await unlink(getAbsoluteMaterialPath(material.filePath)).catch(() => undefined);
  }

  return NextResponse.redirect(new URL(`/groups/${material.groupId}?tab=materials`, request.url), 303);
}
