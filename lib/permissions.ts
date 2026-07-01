import { prisma } from "./prisma";

export async function canOpenGroup(userId: number, groupId: number) {
  // Точечный запрос: не тянем все memberships группы, а проверяем доступ прямо в WHERE.
  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      OR: [{ teacherId: userId }, { memberships: { some: { userId } } }],
    },
    select: { id: true },
  });

  return group !== null;
}

export function createInviteCode() {
  const part = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `GEO-${part}`;
}
