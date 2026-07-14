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
  computeAchievementStats,
  type BadgeFamily,
} from "@/lib/achievements";
import { getT, type TranslationKey } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/tasks";

export default async function AchievementsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const t = await getT();

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
          <span aria-hidden="true">←</span> {t("ach.toDashboard")}
        </Link>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight text-ink">{t("common.achievements")}</h1>
            <p className="mt-1 text-sm text-ink-soft">
              {t("ach.earnedPrefix")} {earnedCount} {t("stats.of")} {badgeCatalog.length}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge tone="emerald">{t("ach.solvedTasks")} {stats.solvedTasks}</Badge>
            <Badge tone="emerald">{t("ach.solvedMaps")} {stats.solvedMaps}</Badge>
            <Badge tone={stats.currentStreak > 0 ? "green" : "gray"}>
              {t("ach.streak")} {stats.currentStreak} {t("ach.days")}
            </Badge>
          </div>
        </div>

        {newlyEarnedCodes.size > 0 && (
          <div className="mb-6 rounded-lg border border-rust/30 bg-rust-soft px-4 py-3 text-sm text-rust-deep">
            <span className="font-semibold">{t("ach.congrats")}</span> {t("ach.newBadgesPre")} {newlyEarnedCodes.size}.{" "}
            {t("ach.newBadgesPost")}
          </div>
        )}

        {user.role === "TEACHER" && earnedCount === 0 ? (
          <EmptyState
            title={t("ach.teacherEmptyTitle")}
            description={t("ach.teacherEmptyDesc")}
          />
        ) : (
          <div className="space-y-8">
            {families.map((family) => (
              <section key={family}>
                <h2 className="mb-3 font-heading text-[15px] font-semibold text-ink">
                  {t(`badgeFamily.${family}` as TranslationKey)}
                </h2>
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
                                <Badge tone="emerald">{t("ach.new")}</Badge>
                              ) : (
                                <Badge tone="green">{t("ach.received")}</Badge>
                              )
                            ) : (
                              <Badge tone="gray">
                                {current}/{badge.target}
                              </Badge>
                            )}
                          </div>
                          <h3 className="mt-2 font-semibold text-ink">
                            {t(`badge.${badge.code}.title` as TranslationKey)}
                          </h3>
                          <p className="mt-0.5 text-sm text-ink-soft">
                            {t(`badge.${badge.code}.desc` as TranslationKey)}
                          </p>
                          {earnedBadge ? (
                            <p className="mt-3 text-xs text-ink-mute">
                              {t("ach.receivedAtPre")} {formatDateTime(earnedBadge.earnedAt)}
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
