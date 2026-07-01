import { Role } from "@prisma/client";
import { unlink } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import {
  getAbsoluteMaterialPath,
  isAllowedFileName,
  isFileMaterial,
  saveMaterialFile,
  validateMaterialType,
} from "@/lib/materials";
import { prisma } from "@/lib/prisma";
import { isUploadTooLarge, maxUploadLabel } from "@/lib/uploads";

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

  const backTo = `/groups/${material.groupId}?tab=materials`;
  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const type = validateMaterialType(String(formData.get("type") ?? ""));
  const url = String(formData.get("url") ?? "").trim();
  const file = formData.get("file");

  if (!title || !description || !type) {
    return redirectWithError(request, backTo, "Заполните название, описание и тип материала.");
  }

  if (!isFileMaterial(type)) {
    if (!url) {
      return redirectWithError(request, backTo, "Добавьте ссылку на внешний ресурс.");
    }

    await prisma.material.update({
      where: { id: materialId },
      data: { title, description, type, url, filePath: null, originalFileName: null },
    });

    if (material.filePath) {
      await unlink(getAbsoluteMaterialPath(material.filePath)).catch(() => undefined);
    }

    return redirectAfterPost(request, backTo);
  }

  const newFileSelected = file instanceof File && file.size > 0;

  if (!newFileSelected && (!material.filePath || material.type !== type)) {
    return redirectWithError(request, backTo, "Загрузите файл для выбранного типа материала.");
  }

  if (newFileSelected && isUploadTooLarge(file.size)) {
    return redirectWithError(request, backTo, `Файл слишком большой. Максимум — ${maxUploadLabel()}.`);
  }

  if (newFileSelected && !isAllowedFileName(type, file.name)) {
    return redirectWithError(request, backTo, "Файл не соответствует выбранному типу материала.");
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

  return redirectAfterPost(request, backTo);
}
