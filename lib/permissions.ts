import { randomInt } from "crypto";
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

// Без похожих символов (O/0, I/1/L), чтобы код было легко диктовать и вводить.
const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const INVITE_LENGTH = 8;

export function createInviteCode() {
  // crypto.randomInt вместо Math.random: код приглашения — это фактически пароль группы,
  // предсказуемый генератор позволил бы перебирать коды через /api/groups/join.
  let part = "";
  for (let i = 0; i < INVITE_LENGTH; i += 1) {
    part += INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)];
  }
  return `GEO-${part}`;
}
