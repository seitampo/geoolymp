import type { Prisma } from "@prisma/client";

export const lessonInclude = {
  group: true,
  items: {
    orderBy: { position: "asc" },
    include: {
      task: { include: { submissions: { include: { review: true } } } },
    },
  },
  materials: { orderBy: { uploadedAt: "asc" }, include: { views: true } },
  attempts: { include: { answers: true }, orderBy: { startedAt: "desc" } },
} satisfies Prisma.TaskSetInclude;
export type LessonData = Prisma.TaskSetGetPayload<{
  include: typeof lessonInclude;
}>;
export type LessonMember = {
  userId: number;
  user: { id: number; name: string };
};
