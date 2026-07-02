import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { parseEntityId } from "@/lib/params";
import { canOpenGroup } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { contentDisposition, getAbsoluteUploadPath } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  const { id } = await params;
  const submissionId = parseEntityId(id);

  if (!user) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (submissionId === null) {
    return NextResponse.json({ error: "Файл не найден." }, { status: 404 });
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { task: true },
  });

  if (!submission || !submission.filePath || !(await canOpenGroup(user.id, submission.task.groupId))) {
    return NextResponse.json({ error: "Файл не найден." }, { status: 404 });
  }

  const file = await readFile(getAbsoluteUploadPath(submission.filePath));

  return new NextResponse(file, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": contentDisposition("attachment", submission.originalFileName ?? "submission"),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
