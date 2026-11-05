import { publishedTaskWhere } from "@/lib/lessonAccess";
import { getLessonText } from "@/lib/lessonText";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Button, LinkButton } from "@/components/Button";
import { cardClasses } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ErrorBanner, SuccessBanner } from "@/components/ErrorBanner";
import { Header } from "@/components/Header";
import { inputClasses, TextArea, TextInput } from "@/components/FormFields";
import {
  awardEarnedBadges,
  badgeCatalog,
  computeAchievementStats,
} from "@/lib/achievements";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { studentTaskStatus } from "@/lib/taskStatus";
import { notInTrainingSetFilter } from "@/lib/training";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { error, ok } = await searchParams;
  const t = await getT();
  const teacher = user.role === "TEACHER";
  const lessonText = await getLessonText();
  const groups = await prisma.group.findMany({
    where: teacher
      ? { teacherId: user.id }
      : { memberships: { some: { userId: user.id } } },
    orderBy: { id: "desc" },
    include: {
      _count: {
        select: {
          tasks: teacher ? true : { where: publishedTaskWhere() },
          taskSets: teacher ? true : { where: { isPublished: true } },
          memberships: true,
        },
      },
      tasks: {
        where: teacher
          ? notInTrainingSetFilter
          : { AND: [notInTrainingSetFilter, publishedTaskWhere()] },
        orderBy: { id: "asc" },
        include: {
          setItems: {
            where: { set: { isPublished: true, trainingMinutes: null } },
            select: { setId: true },
          },
          submissions: {
            where: { studentId: user.id },
            include: { review: true },
          },
        },
      },
    },
  });
  const groupIds = groups.map((group) => group.id);
  const results = teacher
    ? []
    : await prisma.review.findMany({
        where: {
          seenByStudentAt: null,
          submission: {
            studentId: user.id,
            task: {
              groupId: { in: groupIds },
              AND: [publishedTaskWhere(), notInTrainingSetFilter],
            },
          },
        },
        include: {
          submission: {
            include: {
              task: {
                include: {
                  setItems: {
                    where: { set: { isPublished: true } },
                    select: { setId: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { id: "desc" },
        take: 5,
      });
  const ongoing = teacher
    ? null
    : await prisma.trainingAttempt.findFirst({
        where: {
          studentId: user.id,
          finishedAt: null,
          set: { groupId: { in: groupIds }, isPublished: true },
        },
        include: { set: true },
        orderBy: { startedAt: "desc" },
      });
  let achievements: { earned: number; streak: number } | null = null;
  if (!teacher) {
    const stats = await computeAchievementStats(user.id);
    await awardEarnedBadges(user.id, stats);
    achievements = {
      earned: await prisma.earnedBadge.count({ where: { userId: user.id } }),
      streak: stats.currentStreak,
    };
  }
  const nextGroup =
    groups.find((group) =>
      group.tasks.some(
        (task) =>
          studentTaskStatus(task.submissions[0], task.maxScore) !== "solved",
      ),
    ) ?? groups[0];
  const nextTask = nextGroup?.tasks.find(
    (task) =>
      studentTaskStatus(task.submissions[0], task.maxScore) !== "solved",
  );
  const resumeHref = ongoing
    ? "/groups/" + ongoing.set.groupId + "/sets/" + ongoing.setId + "/training"
    : nextTask
      ? "/groups/" +
        nextGroup.id +
        (nextTask.setItems[0]
          ? "/sets/" + nextTask.setItems[0].setId
          : "?tab=tasks") +
        "#task-" +
        nextTask.id
      : nextGroup
        ? "/groups/" + nextGroup.id + "?tab=sets"
        : null;
  return (
    <>
      <Header user={user} />
      <main className="mx-auto max-w-5xl space-y-7 px-4 py-7 sm:px-6 sm:py-10">
        <ErrorBanner message={error} />
        <SuccessBanner message={ok} />
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-navy">
            Olympic Meridian
          </p>
          <h1 className="font-heading text-xl font-semibold sm:text-2xl">
            {t("dashboard.title")}
          </h1>
          <p className="mt-2 text-ink-soft">
            {t(teacher ? "ui.teacherSubtitle" : "ui.studentSubtitle")}
          </p>
        </div>
        {!teacher && resumeHref && (
          <section className="flex flex-col justify-between gap-5 rounded-2xl bg-navy p-6 text-white sm:flex-row sm:items-center sm:p-7">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-white/70">
                {t("ui.continue")}
              </p>
              <h2 className="mt-2 text-lg font-semibold">
                {ongoing?.set.title ?? nextTask?.title ?? nextGroup.name}
              </h2>
              <p className="mt-1 text-sm text-white/75">
                {ongoing ? t("ui.trainingHint") : nextGroup?.name}
              </p>
            </div>
            <Link
              href={resumeHref}
              className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-navy"
            >
              {t("ui.continue")} →
            </Link>
          </section>
        )}
        {results.length > 0 && (
          <section className={cardClasses}>
            <h2 className="mb-3 font-semibold">{t("ui.newResults")}</h2>
            <div className="divide-y divide-line">
              {results.map((review) => (
                <Link
                  key={review.id}
                  href={
                    "/groups/" +
                    review.submission.task.groupId +
                    (review.submission.task.setItems[0]
                      ? "/sets/" + review.submission.task.setItems[0].setId
                      : "?tab=tasks") +
                    "#task-" +
                    review.submission.taskId
                  }
                  className="flex items-center justify-between gap-3 py-3 text-sm hover:text-navy"
                >
                  <span>{review.submission.task.title}</span>
                  <Badge tone="green">
                    {review.score}/{review.submission.task.maxScore}
                  </Badge>
                </Link>
              ))}
            </div>
          </section>
        )}
        <section>
          <h2 className="mb-4 font-heading text-base font-semibold">
            {t("dashboard.groups")}
          </h2>
          {groups.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {groups.map((group) => (
                <article key={group.id} className={cardClasses}>
                  <h3 className="text-base font-semibold">{group.name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">
                    {group.description}
                  </p>
                  <div className="my-4 flex flex-wrap gap-2">
                    <Badge>
                      {t("set.tasksBadge")}: {group._count.tasks}
                    </Badge>
                    <Badge>
                      {t("group.tabSets")}: {group._count.taskSets}
                    </Badge>
                    {teacher && (
                      <Badge tone="emerald">{group.inviteCode}</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <LinkButton
                      href={"/groups/" + group.id + "?tab=sets"}
                      variant="primary"
                      className="min-h-11"
                    >
                      {lessonText.lessons} →
                    </LinkButton>
                    {teacher && (
                      <LinkButton
                        href={"/groups/" + group.id + "/lessons/new"}
                        className="min-h-11"
                      >
                        + {lessonText.createLesson}
                      </LinkButton>
                    )}
                    {teacher && (
                      <LinkButton
                        href={
                          "/groups/" +
                          group.id +
                          "?tab=submissions&filter=pending"
                        }
                        className="min-h-11"
                      >
                        {t("group.tabSubmissions")}
                      </LinkButton>
                    )}
                    <LinkButton
                      href={"/groups/" + group.id + "?tab=materials"}
                      className="min-h-11"
                    >
                      {t("group.tabMaterials")}
                    </LinkButton>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title={t("dashboard.emptyTitle")}
              description={t(
                teacher ? "dashboard.emptyTeacher" : "dashboard.emptyStudent",
              )}
            />
          )}
        </section>
        <details open={!groups.length} className={cardClasses}>
          <summary className="cursor-pointer font-semibold">
            {t(
              teacher
                ? "dashboard.createGroup"
                : groups.length
                  ? "ui.joinCompact"
                  : "dashboard.joinGroup",
            )}
          </summary>
          {teacher ? (
            <form
              className="mt-4 grid max-w-xl gap-4"
              action="/api/groups"
              method="post"
            >
              <TextInput
                label={t("dashboard.groupName")}
                name="name"
                placeholder={t("dashboard.groupNamePlaceholder")}
              />
              <TextArea
                label={t("dashboard.groupDesc")}
                name="description"
                placeholder={t("dashboard.groupDescPlaceholder")}
              />
              <Button className="min-h-11 w-fit">
                {t("dashboard.createGroup")}
              </Button>
            </form>
          ) : (
            <form
              className="mt-4 flex max-w-md flex-col gap-3 sm:flex-row"
              action="/api/groups/join"
              method="post"
            >
              <input
                className={"min-w-0 flex-1 " + inputClasses}
                aria-label={t("dashboard.joinCodePlaceholder")}
                name="inviteCode"
                placeholder={t("dashboard.joinCodePlaceholder")}
                required
              />
              <Button className="min-h-11">{t("dashboard.join")}</Button>
            </form>
          )}
        </details>
        {achievements && (
          <Link
            href="/achievements"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-5 py-4 text-sm"
          >
            <span className="font-semibold">{t("common.achievements")} →</span>
            <span className="text-ink-mute">
              {t("dashboard.badges")}: {achievements.earned}/
              {badgeCatalog.length} · {t("dashboard.streak")}{" "}
              {achievements.streak} {t("dashboard.days")}
            </span>
          </Link>
        )}
      </main>
    </>
  );
}
