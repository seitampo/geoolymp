import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Button, LinkButton } from "@/components/Button";
import { cardClasses } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Header } from "@/components/Header";
import { inputClasses, TextArea, TextInput } from "@/components/FormFields";
import { awardEarnedBadges, badgeCatalog, computeAchievementStats } from "@/lib/achievements";
import { getCurrentUser } from "@/lib/auth";
import { getOlympiadPhase, getOlympiadPhaseLabel } from "@/lib/olympiads";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/tasks";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await searchParams;

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

  // Олимпиады: учителю — свои, ученику — назначенные его группам.
  const olympiadCards =
    user.role === "TEACHER"
      ? (
          await prisma.olympiad.findMany({
            where: { teacherId: user.id },
            include: { _count: { select: { tasks: true, groups: true, attempts: true } } },
            orderBy: { opensAt: "desc" },
          })
        ).map((olympiad) => ({
          id: olympiad.id,
          title: olympiad.title,
          opensAt: olympiad.opensAt,
          closesAt: olympiad.closesAt,
          phase: getOlympiadPhase(olympiad),
          note: `${olympiad._count.tasks} задач · ${olympiad._count.groups} групп · попыток: ${olympiad._count.attempts}`,
        }))
      : (
          await prisma.olympiad.findMany({
            where: { groups: { some: { group: { memberships: { some: { userId: user.id } } } } } },
            include: {
              _count: { select: { tasks: true } },
              attempts: { where: { studentId: user.id } },
            },
            orderBy: { opensAt: "desc" },
          })
        ).map((olympiad) => {
          const attempt = olympiad.attempts[0];
          return {
            id: olympiad.id,
            title: olympiad.title,
            opensAt: olympiad.opensAt,
            closesAt: olympiad.closesAt,
            phase: getOlympiadPhase(olympiad),
            note: `${olympiad._count.tasks} задач · ${olympiad.durationMinutes} мин · ${
              attempt ? (attempt.finishedAt ? "вы участвовали" : "попытка идёт") : "вы ещё не участвовали"
            }`,
          };
        });

  return (
    <>
      <Header user={user} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-gray-900">Личный кабинет</h1>
        <ErrorBanner message={error} />

        {user.role === "TEACHER" ? (
          <section className={`${cardClasses} mb-8`}>
            <h2 className="mb-4 text-base font-semibold text-gray-900">Создать группу</h2>
            <form className="grid gap-4" action="/api/groups" method="post">
              <TextInput label="Название" name="name" placeholder="Например: Сборная 9-х классов" />
              <TextArea label="Описание" name="description" placeholder="Чем занимается группа" />
              <Button className="w-fit">Создать группу</Button>
            </form>
          </section>
        ) : (
          <section className={`${cardClasses} mb-8`}>
            <h2 className="mb-4 text-base font-semibold text-gray-900">Вступить в группу</h2>
            <form className="flex max-w-md flex-col gap-2 sm:flex-row" action="/api/groups/join" method="post">
              <input
                className={`flex-1 ${inputClasses}`}
                name="inviteCode"
                placeholder="Код приглашения, например GEO-ABC12345"
                required
              />
              <Button className="shrink-0">Вступить</Button>
            </form>
          </section>
        )}

        {achievements && (
          <Link
            href="/achievements"
            className={`${cardClasses} mb-8 flex flex-wrap items-center justify-between gap-3 transition hover:border-emerald-300 hover:shadow-md`}
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900">Достижения</h2>
                {achievements.unseenCount > 0 && (
                  <Badge tone="emerald">Новых: {achievements.unseenCount}</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Значков: {achievements.earnedCount} из {badgeCatalog.length} · стрик{" "}
                {achievements.streak} дн.
              </p>
            </div>
            <span className="text-2xl" aria-hidden="true">
              🏅
            </span>
          </Link>
        )}

        <section className="mb-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Олимпиады</h2>
            {user.role === "TEACHER" && (
              <LinkButton href="/olympiads/new" variant="primary" size="sm">
                Создать олимпиаду
              </LinkButton>
            )}
          </div>
          {olympiadCards.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {olympiadCards.map((olympiad) => (
                <Link
                  className={`${cardClasses} block transition hover:border-emerald-300 hover:shadow-md`}
                  href={`/olympiads/${olympiad.id}`}
                  key={olympiad.id}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900">{olympiad.title}</h3>
                    <Badge
                      tone={
                        olympiad.phase === "running"
                          ? "green"
                          : olympiad.phase === "upcoming"
                            ? "amber"
                            : "gray"
                      }
                    >
                      {getOlympiadPhaseLabel(olympiad.phase)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{olympiad.note}</p>
                  <p className="mt-2 text-xs text-gray-500">
                    {formatDateTime(olympiad.opensAt)} — {formatDateTime(olympiad.closesAt)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              {user.role === "TEACHER"
                ? "Олимпиад пока нет — соберите первую за пару минут."
                : "Назначенных олимпиад пока нет."}
            </p>
          )}
        </section>

        <h2 className="mb-4 text-lg font-semibold text-gray-900">Группы</h2>
        {groups.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {groups.map((group) => (
              <Link
                className={`${cardClasses} block transition hover:border-emerald-300 hover:shadow-md`}
                href={`/groups/${group.id}`}
                key={group.id}
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-gray-900">{group.name}</h2>
                  {groupsWithNewResults.has(group.id) && <Badge tone="emerald">Новый результат</Badge>}
                </div>
                <p className="mt-1 text-sm text-gray-600">{group.description}</p>
                {user.role === "TEACHER" && (
                  <div className="mt-3">
                    <Badge tone="emerald">
                      Код: <span className="font-mono">{group.inviteCode}</span>
                    </Badge>
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Групп пока нет"
            description={
              user.role === "TEACHER"
                ? "Создайте первую группу и отправьте ученикам код приглашения."
                : "Попросите у учителя код приглашения и вступите в группу."
            }
          />
        )}
      </main>
    </>
  );
}
