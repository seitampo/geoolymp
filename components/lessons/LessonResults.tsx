import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { Button } from "@/components/Button";
import { TextArea, TextInput } from "@/components/FormFields";
import { MapAnswerInput } from "@/components/MapPoint";
import { mapAnswerLabels } from "@/lib/mapLabels";
import { getT } from "@/lib/i18n";
import { lessonProgress } from "@/lib/lessonProgress";
import type { LessonData, LessonMember } from "@/lib/lessonData";
import type { LessonText } from "@/lib/lessonText";
export async function LessonResults({
  lesson,
  members,
  studentId,
  text,
}: {
  lesson: LessonData;
  members: LessonMember[];
  studentId?: number;
  text: LessonText;
}) {
  const t = await getT();
  const base = `/groups/${lesson.groupId}/sets/${lesson.id}?step=results`;
  const progress = lessonProgress(
    lesson.items,
    members.map((member) => member.userId),
  );
  const summaries = members.map((member) => {
    const practice = progress.members.find(
      (row) => row.studentId === member.userId,
    )!;
    const attempt = lesson.attempts.find(
      (row) => row.studentId === member.userId,
    );
    const materialsComplete =
      lesson.materials.length > 0 &&
      lesson.materials.every((material) =>
        material.views.some((view) => view.userId === member.userId),
      );
    return {
      ...member,
      submitted:
        lesson.trainingMinutes !== null
          ? (attempt?.answers.length ?? 0)
          : practice.submitted,
      complete:
        lesson.trainingMinutes !== null
          ? Boolean(attempt?.finishedAt)
          : lesson.items.length
            ? practice.complete
            : materialsComplete,
      pending:
        lesson.trainingMinutes !== null
          ? attempt?.finishedAt
            ? attempt.answers.filter((answer) => answer.isCorrect === null)
                .length
            : 0
          : practice.pending,
      score:
        lesson.trainingMinutes !== null
          ? (attempt?.answers.reduce((sum, answer) => sum + answer.score, 0) ??
            0)
          : practice.score,
    };
  });
  const selected =
    summaries.find((row) => row.userId === studentId) ??
    summaries.find((row) => row.pending > 0) ??
    summaries[0];
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{text.results}</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {text.submitted} {summaries.filter((row) => row.complete).length}/
          {members.length} · {text.pending}:{" "}
          {summaries.reduce((sum, row) => sum + row.pending, 0)}
        </p>
      </div>
      {!members.length ? (
        <p className="rounded-xl border border-line bg-white p-6 text-sm text-ink-soft">
          {text.noMembers}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-paper text-xs text-ink-mute">
                <tr>
                  <th className="p-4">{text.students}</th>
                  <th className="p-4">{text.answers}</th>
                  <th className="p-4">{text.score}</th>
                  <th className="p-4">{text.review}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {summaries.map((row) => (
                  <tr
                    key={row.userId}
                    className={
                      selected?.userId === row.userId ? "bg-navy-soft/50" : ""
                    }
                  >
                    <td className="p-4">
                      <Link
                        className="font-medium text-navy underline underline-offset-4"
                        href={`${base}&student=${row.userId}#answers`}
                      >
                        {row.user.name}
                      </Link>
                      <span className="mt-1 block text-xs text-ink-mute">
                        {row.complete
                          ? text.done
                          : row.submitted
                            ? text.inProgress
                            : text.notSubmitted}
                      </span>
                    </td>
                    <td className="p-4">
                      {row.submitted}/{lesson.items.length}
                    </td>
                    <td className="p-4">
                      {row.score}/
                      {lesson.items.reduce(
                        (sum, item) => sum + item.task.maxScore,
                        0,
                      )}
                    </td>
                    <td className="p-4">
                      {row.pending ? (
                        <Link
                          className="inline-flex min-h-10 items-center rounded-lg bg-amber-50 px-3 font-medium text-amber-900"
                          href={`${base}&student=${row.userId}#answers`}
                        >
                          {text.review} {row.pending}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selected && (
            <section id="answers" className="scroll-mt-24 space-y-4">
              <h3 className="font-semibold">
                {selected.user.name} · {text.answers}
              </h3>
              {lesson.items.map((item) => {
                const submission = item.task.submissions.find(
                  (entry) => entry.studentId === selected.userId,
                );
                const attempt = lesson.attempts.find(
                  (entry) => entry.studentId === selected.userId,
                );
                const answer = attempt?.finishedAt
                  ? attempt.answers.find(
                      (entry) => entry.taskId === item.taskId,
                    )
                  : undefined;
                const entry =
                  lesson.trainingMinutes !== null ? answer : submission;
                const reviewScore = answer?.score ?? submission?.review?.score;
                return (
                  <article
                    key={item.id}
                    className="rounded-xl border border-line bg-white p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-semibold">{item.task.title}</h4>
                      <span className="text-xs text-ink-mute">
                        {text.maxScore}: {item.task.maxScore}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">
                      {item.task.description}
                    </p>
                    {entry ? (
                      <>
                        <div className="mt-4 rounded-lg bg-paper p-4">
                          <p className="mb-2 text-xs font-medium text-ink-mute">
                            {text.answer}
                          </p>
                          {item.task.type === "MAP_POINT" &&
                          item.task.imagePath ? (
                            <MapAnswerInput
                              imageUrl={`/api/tasks/${item.taskId}/image`}
                              value={entry.answer}
                              readOnly
                              labels={mapAnswerLabels(t)}
                              target={
                                item.task.mapTargetX !== null &&
                                item.task.mapTargetY !== null &&
                                item.task.mapRadius !== null
                                  ? {
                                      x: item.task.mapTargetX,
                                      y: item.task.mapTargetY,
                                      radius: item.task.mapRadius,
                                    }
                                  : undefined
                              }
                            />
                          ) : (
                            <p className="whitespace-pre-wrap text-sm">
                              {entry.answer || "—"}
                            </p>
                          )}
                          {submission?.filePath && (
                            <a
                              href={`/api/submissions/${submission.id}/file`}
                              className="mt-2 inline-block text-sm text-navy underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {submission.originalFileName ?? text.download}
                            </a>
                          )}
                        </div>
                        <details className="mt-3 text-sm">
                          <summary className="cursor-pointer text-ink-soft">
                            {t("taskCard.correctAnswer")}
                          </summary>
                          <p className="mt-2 whitespace-pre-wrap">
                            {item.task.correctAnswer ??
                              item.task.explanationText ??
                              "—"}
                          </p>
                        </details>
                        <ActionForm
                          action={
                            answer
                              ? `/api/training/answers/${answer.id}/review`
                              : `/api/submissions/${submission!.id}/review`
                          }
                          errorLabel={text.error}
                          savingLabel={text.saving}
                          successLabel={text.saved}
                          stayOnPage
                        >
                          <input
                            type="hidden"
                            name="returnTo"
                            value={`${base}&student=${selected.userId}#answers`}
                          />
                          <TextInput
                            label={`${text.score} (0–${item.task.maxScore})`}
                            name="score"
                            step={0.5}
                            type="number"
                            min={0}
                            max={item.task.maxScore}
                            defaultValue={reviewScore ?? undefined}
                          />
                          {!answer && (
                            <TextArea
                              label={`${text.feedback} · ${text.optional}`}
                              name="feedback"
                              required={false}
                              defaultValue={submission?.review?.feedback ?? ""}
                            />
                          )}
                          <Button className="w-fit">{text.saveReview}</Button>
                        </ActionForm>
                      </>
                    ) : (
                      <p className="mt-4 text-sm text-ink-mute">
                        {text.noAnswers}
                      </p>
                    )}
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}
    </section>
  );
}
