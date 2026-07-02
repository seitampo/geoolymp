import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { copyUploadedFile } from "@/lib/uploads";

export const runtime = "nodejs";

/** Дублирование материала в выбранную группу учителя (включая копию файла). */
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

  const backTo = `/groups/${material.groupId}?tab=materials`;
  const formData = await request.formData();
  const targetGroupId = parseEntityId(String(formData.get("targetGroupId") ?? ""));

  if (targetGroupId === null) {
    return redirectWithError(request, backTo, "Выберите группу для копирования.");
  }

  const targetGroup = await prisma.group.findUnique({ where: { id: targetGroupId } });
  if (!targetGroup || targetGroup.teacherId !== user.id) {
    return redirectWithError(request, backTo, "Группа для копирования не найдена.");
  }

  // Файл копируется физически: удаление оригинала не должно ломать копию.
  const copiedFilePath = material.filePath ? await copyUploadedFile(material.filePath, "materials") : null;
  if (material.filePath && copiedFilePath === null) {
    return redirectWithError(request, backTo, "Файл материала не найден на диске — копирование отменено.");
  }

  await prisma.material.create({
    data: {
      groupId: targetGroup.id,
      title: material.title,
      description: material.description,
      type: material.type,
      url: material.url,
      filePath: copiedFilePath,
      originalFileName: copiedFilePath ? material.originalFileName : null,
    },
  });

  return redirectAfterPost(request, `/groups/${targetGroup.id}?tab=materials`);
}
