import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { getAbsoluteMaterialPath, recordMaterialView } from "@/lib/materials";
import { parseEntityId } from "@/lib/params";
import { canOpenGroup } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { contentDisposition } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const materialId = parseEntityId(id);

  if (!user) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (materialId === null) {
    return NextResponse.json({ error: "Материал не найден." }, { status: 404 });
  }

  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material || !(await canOpenGroup(user.id, material.groupId))) {
    return NextResponse.json({ error: "Материал не найден." }, { status: 404 });
  }

  // Скачивание — явное действие ученика, засчитываем материал изученным.
  if (user.role === "STUDENT") {
    await recordMaterialView(material.id, user.id);
  }

  if (material.url) {
    return NextResponse.redirect(material.url);
  }

  if (!material.filePath) {
    return NextResponse.json({ error: "Файл не найден." }, { status: 404 });
  }

  const file = await readFile(getAbsoluteMaterialPath(material.filePath));

  return new NextResponse(file, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": contentDisposition("attachment", material.originalFileName ?? "material"),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
