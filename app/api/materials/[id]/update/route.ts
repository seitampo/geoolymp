import { Role } from "@prisma/client";
import { unlink } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import {
  getAbsoluteMaterialPath,
  isAllowedFileName,
  isFileMaterial,
  saveMaterialFile,
  validateMaterialType,
} from "@/lib/materials";
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

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const type = validateMaterialType(String(formData.get("type") ?? ""));
  const url = String(formData.get("url") ?? "").trim();
  const file = formData.get("file");

  if (!title || !description || !type) {
    return NextResponse.json({ error: "Заполните название, описание и тип материала." }, { status: 400 });
  }

  if (!isFileMaterial(type)) {
    if (!url) {
      return NextResponse.json({ error: "Добавьте ссылку на внешний ресурс." }, { status: 400 });
    }

    await prisma.material.update({
      where: { id: materialId },
      data: { title, description, type, url, filePath: null, originalFileName: null },
    });

    if (material.filePath) {
      await unlink(getAbsoluteMaterialPath(material.filePath)).catch(() => undefined);
    }

    return NextResponse.redirect(new URL(`/groups/${material.groupId}?tab=materials`, request.url), 303);
  }

  const newFileSelected = file instanceof File && file.size > 0;

  if (!newFileSelected && (!material.filePath || material.type !== type)) {
    return NextResponse.json({ error: "Загрузите файл для выбранного типа материала." }, { status: 400 });
  }

  if (newFileSelected && !isAllowedFileName(type, file.name)) {
    return NextResponse.json({ error: "Файл не соответствует выбранному типу материала." }, { status: 400 });
  }

  const savedFile = newFileSelected ? await saveMaterialFile(file) : null;

  await prisma.material.update({
    where: { id: materialId },
    data: {
      title,
      description,
      type,
      url: null,
      filePath: savedFile?.filePath ?? material.filePath,
      originalFileName: savedFile?.originalFileName ?? material.originalFileName,
      uploadedAt: savedFile ? new Date() : material.uploadedAt,
    },
  });

  if (savedFile && material.filePath) {
    await unlink(getAbsoluteMaterialPath(material.filePath)).catch(() => undefined);
  }

  return NextResponse.redirect(new URL(`/groups/${material.groupId}?tab=materials`, request.url), 303);
}
