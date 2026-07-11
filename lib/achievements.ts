import { prisma } from "./prisma";

/**
 * Достижения считаются из уже накопленной активности ученика — отдельного
 * журнала событий нет. Каталог значков живёт здесь (в коде), факт получения —
 * в таблице EarnedBadge. Значки выдаются лениво при заходе на страницу достижений
 * (и на дашборд): функция awardEarnedBadges идемпотентна.
 */

export type BadgeFamily = "tasks" | "maps" | "streak";

export type BadgeDef = {
  code: string;
  family: BadgeFamily;
  title: string;
  description: string;
  /** По какому счётчику из AchievementStats считается прогресс. */
  stat: keyof AchievementStats;
  /** Порог для получения значка. */
  target: number;
};

export type AchievementStats = {
  solvedTasks: number;
  solvedMaps: number;
  currentStreak: number;
};

export const badgeCatalog: BadgeDef[] = [
  { code: "task-1", family: "tasks", title: "Первое решение", description: "Решить первую задачу", stat: "solvedTasks", target: 1 },
  { code: "task-10", family: "tasks", title: "Десяток", description: "Решить 10 задач", stat: "solvedTasks", target: 10 },
  { code: "task-50", family: "tasks", title: "Полусотня", description: "Решить 50 задач", stat: "solvedTasks", target: 50 },
  { code: "task-100", family: "tasks", title: "Сотня", description: "Решить 100 задач", stat: "solvedTasks", target: 100 },
  { code: "map-1", family: "maps", title: "Первая карта", description: "Верно отметить объект на карте", stat: "solvedMaps", target: 1 },
  { code: "map-10", family: "maps", title: "Картограф", description: "Решить 10 картозадач", stat: "solvedMaps", target: 10 },
  { code: "map-25", family: "maps", title: "Покоритель карт", description: "Решить 25 картозадач", stat: "solvedMaps", target: 25 },
  { code: "streak-3", family: "streak", title: "Три дня подряд", description: "Заниматься 3 дня подряд", stat: "currentStreak", target: 3 },
  { code: "streak-7", family: "streak", title: "Неделя подряд", description: "Заниматься 7 дней подряд", stat: "currentStreak", target: 7 },
  { code: "streak-30", family: "streak", title: "Месяц подряд", description: "Заниматься 30 дней подряд", stat: "currentStreak", target: 30 },
];

export const badgeFamilyLabels: Record<BadgeFamily, string> = {
  tasks: "Решённые задачи",
  maps: "Картозадачи",
  streak: "Дни подряд",
};

/** День активности в часовом поясе Казахстана (Астана, UTC+5). */
function toAlmatyDayIndex(date: Date): number {
  const almatyDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Almaty",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date); // YYYY-MM-DD
  return Math.floor(Date.parse(`${almatyDate}T00:00:00Z`) / 86_400_000);
}

/** Текущий стрик: сколько дней подряд по сегодня (или вчера — как «ещё не поздно»). */
function computeCurrentStreak(dates: Date[]): number {
  if (dates.length === 0) {
    return 0;
  }

  const activeDays = new Set(dates.map(toAlmatyDayIndex));
  const today = toAlmatyDayIndex(new Date());

  // Стрик «жив», если активность была сегодня или вчера; иначе прервался.
  let cursor = activeDays.has(today) ? today : today - 1;
  if (!activeDays.has(cursor)) {
    return 0;
  }

  let streak = 0;
  while (activeDays.has(cursor)) {
    streak += 1;
    cursor -= 1;
  }

  return streak;
}

export async function computeAchievementStats(userId: number): Promise<AchievementStats> {
  const [solvedTasks, solvedMaps, submissions, trainings, views] = await Promise.all([
    // «Решено» = проверенное решение с положительным баллом (автопроверка или учитель).
    prisma.review.count({ where: { score: { gt: 0 }, submission: { studentId: userId } } }),
    prisma.review.count({
      where: { score: { gt: 0 }, submission: { studentId: userId, task: { type: "MAP_POINT" } } },
    }),
    prisma.submission.findMany({ where: { studentId: userId }, select: { updatedAt: true, createdAt: true } }),
    prisma.trainingAttempt.findMany({ where: { studentId: userId }, select: { startedAt: true } }),
    prisma.materialView.findMany({ where: { userId }, select: { viewedAt: true } }),
  ]);

  const activityDates = [
    ...submissions.flatMap((row) => [row.createdAt, row.updatedAt]),
    ...trainings.map((row) => row.startedAt),
    ...views.map((row) => row.viewedAt),
  ];

  return {
    solvedTasks,
    solvedMaps,
    currentStreak: computeCurrentStreak(activityDates),
  };
}

/** Выдать недостающие заслуженные значки (идемпотентно). */
export async function awardEarnedBadges(userId: number, stats: AchievementStats) {
  const earned = await prisma.earnedBadge.findMany({ where: { userId }, select: { code: true } });
  const earnedCodes = new Set(earned.map((badge) => badge.code));

  const toAward = badgeCatalog.filter(
    (badge) => stats[badge.stat] >= badge.target && !earnedCodes.has(badge.code),
  );

  if (toAward.length === 0) {
    return;
  }

  await prisma.earnedBadge.createMany({
    data: toAward.map((badge) => ({ userId, code: badge.code })),
    skipDuplicates: true,
  });
}
