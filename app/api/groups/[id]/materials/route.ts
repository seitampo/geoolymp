import { MaterialType, Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError, redirectWithSuccess } from "@/lib/formResponse";
import {
  isAllowedFileName,
  isFileMaterial,
  isValidExternalUrl,
  saveMaterialFile,
  validateMaterialType,
} from "@/lib/materials";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { hasStorageRoom, isUploadTooLarge, maxUploadLabel, storageLimitLabel } from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const groupId = parseEntityId(id);

  if (!user || user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (groupId === null) {
    return NextResponse.json({ error: "Группа не найдена." }, { status: 404 });
  }

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group || group.teacherId !== user.id) {
    return NextResponse.json({ error: "Группа не найдена." }, { status: 404 });
  }

  const backTo = `/groups/${groupId}?tab=materials`;
  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const type = validateMaterialType(String(formData.get("type") ?? ""));
  const url = String(formData.get("url") ?? "").trim();
  const file = formData.get("file");

  if (!title || !description || !type) {
    return redirectWithError(request, backTo, "Заполните название, описание и тип материала.");
  }

  if (isFileMaterial(type)) {
    if (!(file instanceof File) || file.size === 0) {
      return redirectWithError(request, backTo, "Загрузите файл для выбранного типа материала.");
    }

    if (isUploadTooLarge(file.size)) {
      return redirectWithError(request, backTo, `Файл слишком большой. Максимум — ${maxUploadLabel()}.`);
    }

    if (!isAllowedFileName(type, file.name)) {
      return redirectWithError(request, backTo, "Файл не соответствует выбранному типу материала.");
    }

    if (!(await hasStorageRoom(file.size))) {
      return redirectWithError(request, backTo, `Достигнут лимит хранилища (${storageLimitLabel()}). Удалите ненужные файлы.`);
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
  } else if (type === MaterialType.LINK) {
    if (!url || !isValidExternalUrl(url)) {
      return redirectWithError(request, backTo, "Добавьте корректную ссылку (http:// или https://).");
    }

    await prisma.material.create({ data: { groupId, title, description, type, url } });
  } else {
    // Текстовый материал: достаточно названия и описания.
    await prisma.material.create({ data: { groupId, title, description, type } });
  }

  return redirectWithSuccess(request, backTo, "Материал добавлен.");
}
