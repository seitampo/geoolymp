import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { parseEntityId } from "@/lib/params";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n";
import { redirectWithError, redirectAfterPost } from "@/lib/formResponse";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUserFromRequest(request);
  if (!user || user.role !== "TEACHER")
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  const setId = parseEntityId((await params).id);
  if (setId === null)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const t = await getT();
  const form = await request.formData();
  const ids = form
    .getAll("materialId")
    .map((value) => parseEntityId(String(value)));
  if (!ids.length || ids.some((id) => id === null))
    return redirectWithError(
      request,
      "/dashboard",
      t("lesson.chooseMaterials"),
    );
  const materialIds = [...new Set(ids as number[])];
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "TaskSet" WHERE id = ${setId} FOR UPDATE`;
    const lesson = await tx.taskSet.findUnique({
      where: { id: setId },
      include: { group: true, _count: { select: { attempts: true } } },
    });
    if (!lesson || lesson.group.teacherId !== user.id)
      return { error: t("lesson.notFound") };
    if (lesson._count.attempts) return { error: t("ui.lockedSet") };
    if (
      (await tx.material.count({
        where: { id: { in: materialIds }, groupId: lesson.groupId },
      })) !== materialIds.length
    )
      return { error: t("lesson.chooseMaterials") };
    await tx.taskSet.update({
      where: { id: setId },
      data: {
        materials:
          form.get("mode") === "remove"
            ? { disconnect: materialIds.map((id) => ({ id })) }
            : { connect: materialIds.map((id) => ({ id })) },
      },
    });
    if (lesson.isPublished && form.get("mode") !== "remove")
      await tx.material.updateMany({
        where: { id: { in: materialIds } },
        data: { isPublished: true },
      });
    return { groupId: lesson.groupId };
  });
  if (result.error)
    return redirectWithError(request, "/dashboard", result.error);
  return redirectAfterPost(
    request,
    "/groups/" + result.groupId + "/sets/" + setId + "?step=content",
  );
}
