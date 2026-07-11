import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { BadgeGlyph } from "@/components/BadgeGlyph";
import { cardClasses } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Header } from "@/components/Header";
import { ProgressBar } from "@/components/ProgressBar";
import { getCurrentUser } from "@/lib/auth";
import {
  awardEarnedBadges,
  badgeCatalog,
  badgeFamilyLabels,
  computeAchievementStats,
  type BadgeFamily,
} from "@/lib/achievements";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/tasks";

export default async function AchievementsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const stats = await computeAchievementStats(user.id);
  await awardEarnedBadges(user.id, stats);

  const earned = await prisma.earnedBadge.findMany({ where: { userId: user.id } });
  const earnedByCode = new Map(earned.map((badge) => [badge.code, badge]));
  const newlyEarnedCodes = new Set(earned.filter((badge) => badge.seenAt === null).map((badge) => badge.code));

  // Отмечаем новые значки просмотренными — как «Новый результат» в проверках.
  if (newlyEarnedCodes.size > 0) {
    await prisma.earnedBadge.updateMany({
      where: { userId: user.id, seenAt: null },
      data: { seenAt: new Date() },
    });
  }

  const earnedCount = earned.length;
  const families = [...new Set(badgeCatalog.map((badge) => badge.family))] as BadgeFamily[];

  return (
    <>
      <Header user={user} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          className="mb-4 inline-flex items-center gap-1 text-sm text-ink-mute transition-colors hover:text-ink"
          href="/dashboard"
        >
          <span aria-hidden="true">←</span> В личный кабинет
        </Link>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight text-ink">Достижения</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Получено значков: {earnedCount} из {badgeCatalog.length}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge tone="emerald">Задач решено: {stats.solvedTasks}</Badge>
            <Badge tone="emerald">Картозадач: {stats.solvedMaps}</Badge>
            <Badge tone={stats.currentStreak > 0 ? "green" : "gray"}>
              Стрик: {stats.currentStreak} дн.
            </Badge>
          </div>
        </div>

        {newlyEarnedCodes.size > 0 && (
          <div className="mb-6 rounded-lg border border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust-deep">
            <span className="font-semibold">Поздравляем!</span> Новых значков: {newlyEarnedCodes.size}.
            Они отмечены ниже.
          </div>
        )}

        {user.role === "TEACHER" && earnedCount === 0 ? (
          <EmptyState
            title="Значки — для учеников"
            description="Достижения начисляются за решённые задачи, картозадачи и стрики."
          />
        ) : (
          <div className="space-y-8">
            {families.map((family) => (
              <section key={family}>
                <h2 className="mb-3 font-heading text-[15px] font-semibold text-ink">{badgeFamilyLabels[family]}</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {badgeCatalog
                    .filter((badge) => badge.family === family)
                    .map((badge) => {
                      const earnedBadge = earnedByCode.get(badge.code);
                      const current = Math.min(stats[badge.stat], badge.target);
                      const isNew = newlyEarnedCodes.has(badge.code);

                      return (
                        <article
                          key={badge.code}
                          className={`${cardClasses} ${
                            earnedBadge ? "" : "opacity-70"
                          } ${isNew ? "ring-2 ring-rust/60" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <BadgeGlyph
                              family={badge.family}
                              className={`h-9 w-9 ${earnedBadge ? "text-rust" : "text-ink-mute/50"}`}
                            />
                            {earnedBadge ? (
                              isNew ? (
                                <Badge tone="emerald">Новый</Badge>
                              ) : (
                                <Badge tone="green">Получен</Badge>
                              )
                            ) : (
                              <Badge tone="gray">
                                {current}/{badge.target}
                              </Badge>
                            )}
                          </div>
                          <h3 className="mt-2 font-semibold text-ink">{badge.title}</h3>
                          <p className="mt-0.5 text-sm text-ink-soft">{badge.description}</p>
                          {earnedBadge ? (
                            <p className="mt-3 text-xs text-ink-mute">
                              Получен: {formatDateTime(earnedBadge.earnedAt)}
                            </p>
                          ) : (
                            <div className="mt-3">
                              <ProgressBar percent={(current / badge.target) * 100} />
                            </div>
                          )}
                        </article>
                      );
                    })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
