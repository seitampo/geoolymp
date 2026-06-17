import { prisma } from "./prisma";

export async function canOpenGroup(userId: number, groupId: number) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { memberships: true },
  });

  if (!group) {
    return false;
  }

  return group.teacherId === userId || group.memberships.some((member) => member.userId === userId);
}

export function createInviteCode() {
  const part = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `GEO-${part}`;
}
