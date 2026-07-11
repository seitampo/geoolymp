import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError, redirectWithSuccess } from "@/lib/formResponse";
import { createInviteCode } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);

  if (!user || user.role !== Role.TEACHER) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name || !description) {
    return redirectWithError(request, "/dashboard", "Заполните название и описание группы.");
  }

  const group = await prisma.group.create({
    data: {
      name,
      description,
      inviteCode: createInviteCode(),
      teacherId: user.id,
    },
  });

  return redirectWithSuccess(request, `/groups/${group.id}`, "Группа создана. Отправьте ученикам код приглашения.");
}
