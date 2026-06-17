import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { isAllowedFileName, isFileMaterial, saveMaterialFile, validateMaterialType } from "@/lib/materials";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

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

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const type = validateMaterialType(String(formData.get("type") ?? ""));
  const url = String(formData.get("url") ?? "").trim();
  const file = formData.get("file");

  if (!title || !description || !type) {
    return NextResponse.json({ error: "Заполните название, описание и тип материала." }, { status: 400 });
  }

  if (isFileMaterial(type)) {
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Загрузите файл для выбранного типа материала." }, { status: 400 });
    }

    if (!isAllowedFileName(type, file.name)) {
      return NextResponse.json({ error: "Файл не соответствует выбранному типу материала." }, { status: 400 });
    }

    const savedFile = await saveMaterialFile(file);

    await prisma.material.create({
      data: {
        groupId,
        title,
        description,
        type,
        filePath: savedFile.filePath,
        originalFileName: savedFile.originalFileName,
      },
    });
  } else {
    if (!url) {
      return NextResponse.json({ error: "Добавьте ссылку на внешний ресурс." }, { status: 400 });
    }

    await prisma.material.create({ data: { groupId, title, description, type, url } });
  }

  return NextResponse.redirect(new URL(`/groups/${groupId}?tab=materials`, request.url), 303);
}
