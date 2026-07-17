import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { BadgeGlyph } from "@/components/BadgeGlyph";
import { Button } from "@/components/Button";
import { cardClasses } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ErrorBanner, SuccessBanner } from "@/components/ErrorBanner";
import { Header } from "@/components/Header";
import { inputClasses, TextArea, TextInput } from "@/components/FormFields";
import { awardEarnedBadges, badgeCatalog, computeAchievementStats } from "@/lib/achievements";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { error, ok } = await searchParams;
  const t = await getT();

  const groups =
    user.role === "TEACHER"
      ? await prisma.group.findMany({ where: { teacherId: user.id }, orderBy: { id: "desc" } })
      : await prisma.group.findMany({
          where: { memberships: { some: { userId: user.id } } },
          orderBy: { id: "desc" },
        });

  // Группы с непросмотренными результатами проверки — для пометки «Новый результат».
  const groupsWithNewResults = new Set(
    user.role === "STUDENT"
      ? (
          await prisma.review.findMany({
            where: { seenByStudentAt: null, submission: { studentId: user.id } },
            select: { submission: { select: { task: { select: { groupId: true } } } } },
          })
        ).map((review) => review.submission.task.groupId)
      : [],
  );

  // Достижения ученика: начисляем недостающие значки и показываем сводку с пометкой новых.
  let achievements: { earnedCount: number; unseenCount: number; streak: number } | null = null;
  if (user.role === "STUDENT") {
    const stats = await computeAchievementStats(user.id);
    await awardEarnedBadges(user.id, stats);
    const [earnedCount, unseenCount] = await Promise.all([
      prisma.earnedBadge.count({ where: { userId: user.id } }),
      prisma.earnedBadge.count({ where: { userId: user.id, seenAt: null } }),
    ]);
    achievements = { earnedCount, unseenCount, streak: stats.currentStreak };
  }

  return (
    <>
      <Header user={user} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 font-heading text-xl font-semibold tracking-tight text-ink">{t("dashboard.title")}</h1>
        <ErrorBanner message={error} />
        <SuccessBanner message={ok} />

        {user.role === "TEACHER" ? (
          <section className={`${cardClasses} mb-8`}>
            <h2 className="mb-4 text-base font-semibold text-ink">{t("dashboard.createGroup")}</h2>
            <form className="grid gap-4" action="/api/groups" method="post">
              <TextInput label={t("dashboard.groupName")} name="name" placeholder={t("dashboard.groupNamePlaceholder")} />
              <TextArea label={t("dashboard.groupDesc")} name="description" placeholder={t("dashboard.groupDescPlaceholder")} />
              <Button className="w-fit">{t("dashboard.createGroup")}</Button>
            </form>
          </section>
        ) : (
          <section className={`${cardClasses} mb-8`}>
            <h2 className="mb-4 text-base font-semibold text-ink">{t("dashboard.joinGroup")}</h2>
            <form className="flex max-w-md flex-col gap-2 sm:flex-row" action="/api/groups/join" method="post">
              <input
                className={`flex-1 ${inputClasses}`}
                name="inviteCode"
                placeholder={t("dashboard.joinCodePlaceholder")}
                required
              />
              <Button className="shrink-0">{t("dashboard.join")}</Button>
            </form>
          </section>
        )}

        {achievements && (
          <Link
            href="/achievements"
            className={`${cardClasses} mb-8 flex flex-wrap items-center justify-between gap-3 transition hover:border-navy/40 hover:shadow-md`}
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-ink">{t("common.achievements")}</h2>
                {achievements.unseenCount > 0 && (
                  <Badge tone="emerald">
                    {t("dashboard.newBadges")}: {achievements.unseenCount}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {t("dashboard.badges")}: {achievements.earnedCount} / {badgeCatalog.length} ·{" "}
                {t("dashboard.streak")} {achievements.streak} {t("dashboard.days")}
              </p>
            </div>
            <BadgeGlyph family="streak" className="h-8 w-8 text-gold" />
          </Link>
        )}

        <h2 className="mb-4 font-heading text-base font-semibold text-ink">{t("dashboard.groups")}</h2>
        {groups.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {groups.map((group) => (
              <Link
                className={`${cardClasses} block transition hover:border-navy/40 hover:shadow-md`}
                href={`/groups/${group.id}`}
                key={group.id}
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-ink">{group.name}</h2>
                  {groupsWithNewResults.has(group.id) && <Badge tone="emerald">{t("dashboard.newResult")}</Badge>}
                </div>
                <p className="mt-1 text-sm text-ink-soft">{group.description}</p>
                {user.role === "TEACHER" && (
                  <div className="mt-3">
                    <Badge tone="emerald">
                      {t("dashboard.code")}: <span className="font-mono">{group.inviteCode}</span>
                    </Badge>
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title={t("dashboard.emptyTitle")}
            description={
              user.role === "TEACHER" ? t("dashboard.emptyTeacher") : t("dashboard.emptyStudent")
            }
          />
        )}
      </main>
    </>
  );
}
