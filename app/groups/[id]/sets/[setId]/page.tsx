import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/Badge";
import { Button, LinkButton } from "@/components/Button";
import { cardClasses } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ErrorBanner } from "@/components/ErrorBanner";
import { SelectField, TextArea, TextInput } from "@/components/FormFields";
import { Header } from "@/components/Header";
import { TaskCard, type TeacherGroupOption } from "@/components/TaskCard";
import { getCurrentUser } from "@/lib/auth";
import { getT, type TFunction } from "@/lib/i18n";
import { parseEntityId } from "@/lib/params";
import { canOpenGroup } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDateTime, isAutoCheckedTask, isTaskVisibleToStudents } from "@/lib/tasks";
import { getTrainingTaskIds, isTrainingSupportedTaskType } from "@/lib/training";

type SetTaskStatus = "solved" | "wrong" | "pending" | "none";

function SetProgressChip({
  index,
  status,
  title,
  t,
}: {
  index: number;
  status: SetTaskStatus;
  title: string;
  t: TFunction;
}) {
  const styles: Record<SetTaskStatus, { className: string; glyph: string; label: string }> = {
    solved: { className: "bg-green-100 text-green-800", glyph: "✓", label: t("setChip.solved") },
    wrong: { className: "bg-red-100 text-red-800", glyph: "✗", label: t("setChip.wrong") },
    pending: { className: "bg-amber-100 text-amber-800", glyph: "⏳", label: t("setChip.pending") },
    none: { className: "bg-ink/5 text-ink-mute/70", glyph: "—", label: t("setChip.none") },
  };
  const style = styles[status];

  return (
    <span
      title={`${t("setChip.taskPrefix")} ${index}: ${title} — ${style.label}`}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${style.className}`}
    >
      {index} {style.glyph}
    </span>
  );
}

export default async function TaskSetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; setId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const t = await getT();
  const { id, setId } = await params;
  const { error } = await searchParams;
  const groupId = parseEntityId(id);
  const parsedSetId = parseEntityId(setId);

  if (groupId === null || parsedSetId === null || !(await canOpenGroup(user.id, groupId))) {
    notFound();
  }

  const set = await prisma.taskSet.findUnique({
    where: { id: parsedSetId },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          task: {
            include: {
              submissions: {
                where: user.role === "STUDENT" ? { studentId: user.id } : undefined,
                include: { review: true, student: true },
              },
            },
          },
        },
      },
    },
  });

  if (!set || set.groupId !== groupId) {
    notFound();
  }

  const isTeacher = user.role === "TEACHER";

  // Черновики в подборке видит только учитель — тот же фильтр, что и на вкладке задач.
  // В обычной подборке ученик не видит и задачи, занятые в тренировках других подборок.
  const quarantinedTaskIds =
    !isTeacher && set.trainingMinutes === null ? await getTrainingTaskIds(groupId) : new Set<number>();
  const visibleItems = isTeacher
    ? set.items
    : set.items.filter(
        (item) => isTaskVisibleToStudents(item.task) && !quarantinedTaskIds.has(item.taskId),
      );

  // Открытие подборки тоже «показывает результат» — снимаем пометку «Новый результат»
  // с задач подборки (та же логика, что на вкладке задач: рендерим по уже загруженным данным).
  if (!isTeacher && visibleItems.length > 0) {
    const hasUnseen = visibleItems.some((item) => {
      const review = item.task.submissions[0]?.review;
      return review != null && review.seenByStudentAt === null;
    });

    if (hasUnseen) {
      await prisma.review.updateMany({
        where: {
          seenByStudentAt: null,
          submission: { studentId: user.id, taskId: { in: visibleItems.map((item) => item.taskId) } },
        },
        data: { seenByStudentAt: new Date() },
      });
    }
  }

  // Учителю нужны сами участники (для «Прогресс учеников»), ученику — только число.
  const members = isTeacher
    ? await prisma.membership.findMany({
        where: { groupId },
        include: { user: true },
        orderBy: { user: { name: "asc" } },
      })
    : [];
  const membersCount = isTeacher
    ? members.length
    : await prisma.membership.count({ where: { groupId } });

  const isTrainingMode = set.trainingMinutes !== null;
  const trainableCount = visibleItems.filter((item) =>
    isTrainingSupportedTaskType(item.task.type),
  ).length;

  // Ученику в тренировочной подборке — только карточка тренировки, без задач.
  const studentAttempt =
    !isTeacher && isTrainingMode
      ? await prisma.trainingAttempt.findUnique({
          where: { setId_studentId: { setId: set.id, studentId: user.id } },
        })
      : null;

  // Учителю — сводка попыток учеников.
  const attempts =
    isTeacher && isTrainingMode
      ? await prisma.trainingAttempt.findMany({
          where: { setId: set.id },
          include: { student: true, answers: true },
          orderBy: { startedAt: "desc" },
        })
      : [];
  const possibleScore = set.items
    .filter((item) => isAutoCheckedTask(item.task))
    .reduce((sum, item) => sum + item.task.maxScore, 0);

  // Прогресс учеников: какие задачи подборки решены. В обычной подборке статус берём
  // из проверенных решений, в тренировке — из ответов завершённых попыток.
  const trainingAnswerByKey = new Map<string, { isCorrect: boolean | null }>();
  const finishedStudentIds = new Set<number>();
  for (const attempt of attempts) {
    if (!attempt.finishedAt) {
      continue;
    }
    finishedStudentIds.add(attempt.studentId);
    for (const answer of attempt.answers) {
      trainingAnswerByKey.set(`${attempt.studentId}:${answer.taskId}`, answer);
    }
  }

  const taskStatusFor = (studentId: number, item: (typeof set.items)[number]): SetTaskStatus => {
    if (isTrainingMode) {
      if (!finishedStudentIds.has(studentId)) {
        return "none";
      }
      const answer = trainingAnswerByKey.get(`${studentId}:${item.taskId}`);
      if (!answer) {
        return "none";
      }
      if (answer.isCorrect === true) {
        return "solved";
      }
      return answer.isCorrect === false ? "wrong" : "pending";
    }

    const submission = item.task.submissions.find((entry) => entry.studentId === studentId);
    if (!submission) {
      return "none";
    }
    if (submission.review && submission.review.score > 0) {
      return "solved";
    }
    return submission.review ? "wrong" : "pending";
  };

  const memberProgress = members.map((membership) => {
    const statuses = set.items.map((item) => ({
      title: item.task.title,
      status: taskStatusFor(membership.userId, item),
    }));
    return {
      userId: membership.userId,
      name: membership.user.name,
      solved: statuses.filter((entry) => entry.status === "solved").length,
      statuses,
    };
  });

  const teacherGroups: TeacherGroupOption[] = isTeacher
    ? await prisma.group.findMany({
        where: { teacherId: user.id },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  // Задачи группы, которых ещё нет в подборке, — для формы добавления.
  const inSetTaskIds = new Set(set.items.map((item) => item.taskId));
  const availableTasks = isTeacher
    ? (
        await prisma.task.findMany({
          where: { groupId },
          select: { id: true, title: true },
          orderBy: { id: "asc" },
        })
      ).filter((task) => !inSetTaskIds.has(task.id))
    : [];

  return (
    <>
      <Header user={user} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <ErrorBanner message={error} />

        <div className="mb-6">
          <Link
            className="mb-4 inline-flex items-center gap-1 text-sm text-ink-mute transition-colors hover:text-ink"
            href={`/groups/${groupId}?tab=sets`}
          >
            <span aria-hidden="true">←</span> {t("setPage.backToSets")}
          </Link>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-xl font-semibold tracking-tight text-ink">{set.title}</h1>
                <Badge tone="emerald">{t("setPage.tasksCount")} {visibleItems.length}</Badge>
                {isTrainingMode && (
                  <Badge tone="amber">
                    {t("setPage.trainingBadgePre")} {set.trainingMinutes} {t("set.minShort")}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-soft">{set.description}</p>
              {!isTeacher && !isTrainingMode && visibleItems.length > 0 && (
                <p className="mt-2 text-xs text-ink-mute">{t("setPage.orderHint")}</p>
              )}
            </div>
            {isTeacher && (
              <form
                className="shrink-0"
                action={`/api/sets/${set.id}/delete`}
                method="post"
                data-confirm={t("setPage.deleteSetConfirm")}
              >
                <Button variant="danger" size="sm">
                  {t("setPage.deleteSet")}
                </Button>
              </form>
            )}
          </div>
        </div>

        {isTeacher && (
          <div className="mb-6 space-y-4">
            <details className={cardClasses}>
              <summary className="cursor-pointer text-sm font-medium text-ink-soft hover:text-ink">
                {t("setPage.editTitleDesc")}
              </summary>
              <form className="mt-4 grid gap-3" action={`/api/sets/${set.id}/update`} method="post">
                <TextInput label={t("field.title")} name="title" defaultValue={set.title} />
                <TextArea label={t("field.description")} name="description" defaultValue={set.description} />
                <TextInput
                  label={t("setPage.trainingMinutesLabel")}
                  name="trainingMinutes"
                  type="number"
                  min={1}
                  max={600}
                  required={false}
                  defaultValue={set.trainingMinutes ?? ""}
                />
                <Button className="w-fit">{t("action.save")}</Button>
              </form>
            </details>

            {availableTasks.length > 0 && (
              <form
                className={`${cardClasses} flex flex-col gap-2 sm:flex-row sm:items-end`}
                action={`/api/sets/${set.id}/tasks`}
                method="post"
              >
                <div className="flex-1">
                  <SelectField
                    label={t("setPage.addTaskFromGroup")}
                    name="taskId"
                    options={availableTasks.map((task) => ({
                      value: String(task.id),
                      label: task.title,
                    }))}
                  />
                </div>
                <Button className="shrink-0">{t("setPage.addToSet")}</Button>
              </form>
            )}

            {isTrainingMode && attempts.length > 0 && (
              <div className={cardClasses}>
                <h2 className="font-heading text-[15px] font-semibold text-ink">{t("setPage.attemptsTitle")}</h2>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-mute">
                        <th className="py-2 pr-3">{t("member.student")}</th>
                        <th className="py-2 pr-3">{t("setPage.thResult")}</th>
                        <th className="py-2 pr-3">{t("setPage.thStatus")}</th>
                        <th className="py-2">{t("setPage.thStarted")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/70">
                      {attempts.map((attempt) => {
                        const earned = attempt.answers.reduce((sum, answer) => sum + answer.score, 0);
                        return (
                          <tr key={attempt.id}>
                            <td className="py-2 pr-3 font-medium text-ink">{attempt.student.name}</td>
                            <td className="py-2 pr-3 text-ink-soft">
                              {attempt.finishedAt ? `${earned} ${t("stats.of")} ${possibleScore}` : "—"}
                            </td>
                            <td className="py-2 pr-3">
                              {attempt.finishedAt ? (
                                <Badge tone="green">{t("setPage.attemptFinished")}</Badge>
                              ) : (
                                <Badge tone="amber">{t("setPage.attemptOngoing")}</Badge>
                              )}
                            </td>
                            <td className="py-2 text-ink-soft">{formatDateTime(attempt.startedAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {members.length > 0 && (
              <div className={cardClasses}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-heading text-[15px] font-semibold text-ink">{t("setPage.progressTitle")}</h2>
                  <p className="text-xs text-ink-mute">{t("setPage.legend")}</p>
                </div>
                <div className="mt-4 space-y-4">
                  {memberProgress.map((member) => (
                    <div key={member.userId}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-ink">{member.name}</span>
                        <Badge tone={member.solved > 0 ? "green" : "gray"}>
                          {t("setPage.solvedOf")} {member.solved} {t("stats.of")} {set.items.length}
                        </Badge>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {member.statuses.map((entry, index) => (
                          <SetProgressChip
                            key={index}
                            index={index + 1}
                            status={entry.status}
                            title={entry.title}
                            t={t}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!isTeacher && isTrainingMode ? (
          <section className={`${cardClasses} text-center`}>
            <h2 className="font-heading font-heading text-[15px] font-semibold text-ink">{t("setPage.trainingTitle")}</h2>
            <p className="mt-2 text-sm text-ink-soft">
              {trainableCount} {t("setPage.tasksWord")} · {set.trainingMinutes} {t("setPage.minutesWord")} ·{" "}
              {t("setPage.oneAttemptNoHints")}
            </p>
            <p className="mt-1 text-xs text-ink-mute">{t("setPage.trainingStartHint")}</p>
            <div className="mt-4 flex justify-center">
              {studentAttempt?.finishedAt ? (
                <LinkButton href={`/groups/${groupId}/sets/${set.id}/training`} variant="secondary">
                  {t("setPage.viewResult")}
                </LinkButton>
              ) : studentAttempt ? (
                <LinkButton href={`/groups/${groupId}/sets/${set.id}/training`} variant="primary">
                  {t("setPage.continueTraining")}
                </LinkButton>
              ) : trainableCount > 0 ? (
                <form action={`/api/sets/${set.id}/training/start`} method="post">
                  <Button variant="primary">{t("setPage.startTraining")}</Button>
                </form>
              ) : (
                <p className="text-sm text-ink-mute">{t("setPage.noTrainingTasks")}</p>
              )}
            </div>
          </section>
        ) : visibleItems.length === 0 ? (
          <EmptyState
            title={t("setPage.emptyTitle")}
            description={isTeacher ? t("setPage.emptyTeacher") : t("setPage.emptyStudent")}
          />
        ) : (
          <div className="space-y-6">
            {visibleItems.map((item, index) => (
              <div key={item.id}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink-mute">
                    {t("setPage.taskWord")} {index + 1} {t("stats.of")} {visibleItems.length}
                  </p>
                  {isTeacher && (
                    <form action={`/api/sets/${set.id}/tasks/remove`} method="post">
                      <input type="hidden" name="taskId" value={item.taskId} />
                      <Button variant="danger" size="sm">
                        {t("setPage.removeFromSet")}
                      </Button>
                    </form>
                  )}
                </div>
                <TaskCard
                  task={item.task}
                  isTeacher={isTeacher}
                  teacherGroups={teacherGroups}
                  membersCount={membersCount}
                  submissionContext={{
                    returnTo: `/groups/${groupId}/sets/${set.id}`,
                    oneShot: true,
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
