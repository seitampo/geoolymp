import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { redirectAfterPost, redirectWithError } from "@/lib/formResponse";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);

  if (!user || user.role !== Role.STUDENT) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  const formData = await request.formData();
  const inviteCode = String(formData.get("inviteCode") ?? "").trim().toUpperCase();

  if (!inviteCode) {
    return redirectWithError(request, "/dashboard", "Введите код приглашения.");
  }

  const group = await prisma.group.findUnique({ where: { inviteCode } });

  if (!group) {
    return redirectWithError(request, "/dashboard", "Группа с таким кодом не найдена.");
  }

  await prisma.membership.upsert({
    where: { userId_groupId: { userId: user.id, groupId: group.id } },
    update: {},
    create: { userId: user.id, groupId: group.id },
  });

  return redirectAfterPost(request, `/groups/${group.id}`);
}
