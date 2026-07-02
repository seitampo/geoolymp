import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost } from "@/lib/formResponse";
import { recordMaterialView } from "@/lib/materials";
import { parseEntityId } from "@/lib/params";
import { canOpenGroup } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/**
 * Явная отметка «изучено» для текстовых материалов: у них нет файла и ссылки,
 * поэтому открытие/скачивание, по которым отмечаются остальные типы, не происходит.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const materialId = parseEntityId(id);

  if (!user || user.role !== Role.STUDENT) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (materialId === null) {
    return NextResponse.json({ error: "Материал не найден." }, { status: 404 });
  }

  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material || !(await canOpenGroup(user.id, material.groupId))) {
    return NextResponse.json({ error: "Материал не найден." }, { status: 404 });
  }

  await recordMaterialView(material.id, user.id);

  return redirectAfterPost(request, `/groups/${material.groupId}?tab=materials`);
}
