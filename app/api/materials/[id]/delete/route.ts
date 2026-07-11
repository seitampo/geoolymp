import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectWithSuccess } from "@/lib/formResponse";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { deleteUploadedFile } from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const materialId = parseEntityId(id);

  if (!user || user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (materialId === null) {
    return NextResponse.json({ error: "Материал не найден." }, { status: 404 });
  }

  const material = await prisma.material.findUnique({ where: { id: materialId }, include: { group: true } });
  if (!material || material.group.teacherId !== user.id) {
    return NextResponse.json({ error: "Материал не найден." }, { status: 404 });
  }

  await prisma.material.delete({ where: { id: materialId } });

  if (material.filePath) {
    await deleteUploadedFile(material.filePath);
  }

  return redirectWithSuccess(request, `/groups/${material.groupId}?tab=materials`, "Материал удалён.");
}
