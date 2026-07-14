import { MaterialType, Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import {
  isAllowedFileName,
  isFileMaterial,
  isValidExternalUrl,
  saveMaterialFile,
  validateMaterialType,
} from "@/lib/materials";
import { getT } from "@/lib/i18n";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { deleteUploadedFile, hasStorageRoom, isUploadTooLarge, maxUploadLabel, storageLimitLabel } from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
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
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const type = validateMaterialType(String(formData.get("type") ?? ""));
  const url = String(formData.get("url") ?? "").trim();
  const file = formData.get("file");

  if (!title || !description || !type) {
    return redirectWithError(request, backTo, t("err.materialFields"));
  }

  if (!isFileMaterial(type)) {
    if (type === MaterialType.LINK && (!url || !isValidExternalUrl(url))) {
      return redirectWithError(request, backTo, t("err.addValidLink"));
    }

    await prisma.material.update({
      where: { id: materialId },
      data: {
        title,
        description,
        type,
        url: type === MaterialType.LINK ? url : null,
        filePath: null,
        originalFileName: null,
      },
    });

    if (material.filePath) {
      await deleteUploadedFile(material.filePath);
    }

    return redirectAfterPost(request, backTo);
  }

  const newFileSelected = file instanceof File && file.size > 0;

  if (!newFileSelected && (!material.filePath || material.type !== type)) {
    return redirectWithError(request, backTo, t("err.materialFile"));
  }

  if (newFileSelected && isUploadTooLarge(file.size)) {
    return redirectWithError(request, backTo, `${t("err.fileTooBig")} ${maxUploadLabel()}.`);
  }

  if (newFileSelected && !isAllowedFileName(type, file.name)) {
    return redirectWithError(request, backTo, t("err.materialFileType"));
  }

  if (newFileSelected && !(await hasStorageRoom(file.size))) {
    return redirectWithError(
      request,
      backTo,
      `${t("err.storagePre")} (${storageLimitLabel()})${t("err.storageDeletePost")}`,
    );
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
    await deleteUploadedFile(material.filePath);
  }

  return redirectAfterPost(request, backTo);
}
