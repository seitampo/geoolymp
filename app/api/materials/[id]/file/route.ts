import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { canOpenGroup } from "@/lib/permissions";
import { getAbsoluteMaterialPath } from "@/lib/materials";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const materialId = Number(id);

  if (!user) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material || !(await canOpenGroup(user.id, material.groupId))) {
    return NextResponse.json({ error: "Материал не найден." }, { status: 404 });
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
      "Content-Type": getContentType(material.originalFileName ?? ""),
      "Content-Disposition": `inline; filename="${encodeURIComponent(material.originalFileName ?? "material")}"`,
    },
  });
}

function getContentType(fileName: string) {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith(".pdf")) return "application/pdf";
  if (lowerName.endsWith(".png")) return "image/png";
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg";
  if (lowerName.endsWith(".webp")) return "image/webp";
  if (lowerName.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lowerName.endsWith(".pptx")) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  if (lowerName.endsWith(".zip")) return "application/zip";

  return "application/octet-stream";
}
