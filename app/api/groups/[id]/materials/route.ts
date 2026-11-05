import { MaterialType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectWithError, redirectWithSuccess } from "@/lib/formResponse";
import { getT } from "@/lib/i18n";
import {
  isAllowedFileName,
  isFileMaterial,
  isValidExternalUrl,
  saveMaterialFile,
  validateMaterialType,
} from "@/lib/materials";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import {
  deleteUploadedFile,
  hasStorageRoom,
  isUploadTooLarge,
  maxUploadLabel,
  storageLimitLabel,
} from "@/lib/uploads";
export const runtime = "nodejs";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const t = await getT();
  const user = await getCurrentUserFromRequest(request);
  const groupId = parseEntityId((await params).id);
  if (!user || user.role !== "TEACHER")
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  const group =
    groupId === null
      ? null
      : await prisma.group.findFirst({
          where: { id: groupId, teacherId: user.id },
        });
  if (!group)
    return NextResponse.json({ error: "Группа не найдена." }, { status: 404 });
  const form = await request.formData();
  const setId = form.has("setId")
    ? parseEntityId(String(form.get("setId")))
    : null;
  const lesson =
    setId === null
      ? null
      : await prisma.taskSet.findFirst({
          where: { id: setId, groupId: group.id },
          include: { _count: { select: { attempts: true } } },
        });
  const backTo = lesson
    ? `/groups/${group.id}/sets/${lesson.id}?step=content`
    : `/groups/${group.id}?tab=materials`;
  if (form.has("setId") && !lesson)
    return redirectWithError(request, backTo, t("lesson.notFound"));
  if (lesson?._count.attempts)
    return redirectWithError(request, backTo, t("ui.lockedSet"));
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const url = String(form.get("url") ?? "").trim();
  const file = form.get("file");
  let type = validateMaterialType(String(form.get("type") ?? ""));
  if (form.get("type") === "FILE" && file instanceof File)
    type =
      Object.values(MaterialType).find((value) =>
        isAllowedFileName(value, file.name),
      ) ?? null;
  if (
    !title ||
    title.length > 200 ||
    !type ||
    (type === "TEXT" && !description)
  )
    return redirectWithError(request, backTo, t("err.materialFields"));
  let saved: Awaited<ReturnType<typeof saveMaterialFile>> | null = null;
  if (isFileMaterial(type)) {
    if (!(file instanceof File) || !file.size)
      return redirectWithError(request, backTo, t("err.materialFile"));
    if (isUploadTooLarge(file.size))
      return redirectWithError(
        request,
        backTo,
        `${t("err.fileTooBig")} ${maxUploadLabel()}.`,
      );
    if (!isAllowedFileName(type, file.name))
      return redirectWithError(request, backTo, t("err.materialFileType"));
    if (!(await hasStorageRoom(file.size)))
      return redirectWithError(
        request,
        backTo,
        `${t("err.storagePre")} (${storageLimitLabel()})${t("err.storageDeletePost")}`,
      );
    saved = await saveMaterialFile(file);
  } else if (type === "LINK" && (!url || !isValidExternalUrl(url)))
    return redirectWithError(request, backTo, t("err.addValidLink"));
  try {
    const created = await prisma.$transaction(async (tx) => {
      let isPublished = true;
      if (lesson) {
        await tx.$queryRaw`SELECT id FROM "TaskSet" WHERE id = ${lesson.id} FOR UPDATE`;
        const current = await tx.taskSet.findUnique({
          where: { id: lesson.id },
          include: { _count: { select: { attempts: true } } },
        });
        if (!current || current._count.attempts) return false;
        isPublished = current.isPublished;
      }
      await tx.material.create({
        data: {
          groupId: group.id,
          title,
          description,
          type: type!,
          url: type === "LINK" ? url : null,
          filePath: saved?.filePath,
          originalFileName: saved?.originalFileName,
          isPublished,
          ...(lesson ? { lessons: { connect: { id: lesson.id } } } : {}),
        } satisfies Prisma.MaterialUncheckedCreateInput,
      });
      return true;
    });
    if (!created) {
      if (saved) await deleteUploadedFile(saved.filePath);
      return redirectWithError(request, backTo, t("ui.lockedSet"));
    }
  } catch (error) {
    if (saved) await deleteUploadedFile(saved.filePath);
    throw error;
  }
  return redirectWithSuccess(request, backTo, t("ok.materialAdded"));
}
