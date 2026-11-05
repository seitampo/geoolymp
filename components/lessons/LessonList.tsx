"use client";

import { useState } from "react";
import Link from "next/link";
import type { LessonText } from "@/lib/lessonText";

export type LessonSummary = {
  id: number;
  title: string;
  description: string;
  trainingMinutes: number | null;
  isPublished: boolean;
  taskCount: number;
  materialCount: number;
  completed: number;
  memberCount: number;
  pending: number;
  answered: number;
  ownComplete: boolean;
  assignedDate: string | null;
};
export function LessonList({
  groupId,
  lessons,
  teacher,
  text,
}: {
  groupId: number;
  lessons: LessonSummary[];
  teacher: boolean;
  text: LessonText;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const shown = lessons.filter(
    (lesson) =>
      lesson.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
      (filter === "all" ||
        (filter === "draft" ? !lesson.isPublished : lesson.isPublished)),
  );
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">{text.lessons}</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {teacher ? text.emptyTeacher : text.studentHint}
          </p>
        </div>
        {teacher && (
          <Link
            href={`/groups/${groupId}/lessons/new`}
            className="inline-flex min-h-12 items-center rounded-lg bg-navy px-5 py-3 text-sm font-semibold text-white"
          >
            + {text.createLesson}
          </Link>
        )}
      </div>
      {lessons.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            aria-label={text.searchLessons}
            placeholder={text.searchLessons}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-line bg-white px-4 text-sm sm:max-w-md"
          />
          {teacher && (
            <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-white p-1">
              {[
                ["all", text.all],
                ["issued", text.onlyIssued],
                ["draft", text.onlyDraft],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                  className={`min-h-10 rounded-md px-3 text-sm ${filter === value ? "bg-navy-soft font-semibold text-navy" : "text-ink-soft"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {!lessons.length ? (
        <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-navy-soft text-2xl text-navy"
            aria-hidden="true"
          >
            ▤
          </div>
          <h3 className="text-base font-semibold">
            {teacher ? text.emptyTitle : text.emptyStudent}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
            {teacher ? text.draftHint : text.issuedHint}
          </p>
        </div>
      ) : !shown.length ? (
        <p className="rounded-xl border border-line bg-white p-6 text-sm text-ink-soft">
          {text.noMatches}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="hidden grid-cols-[minmax(0,1fr)_130px_140px_160px] gap-4 border-b border-line bg-paper/60 px-5 py-3 text-xs font-medium uppercase tracking-wide text-ink-mute md:grid">
            <span>{text.lessons}</span>
            <span>{text.content}</span>
            <span>{teacher ? text.submitted : text.answered}</span>
            <span>{teacher ? text.results : text.open}</span>
          </div>
          <div className="divide-y divide-line">
            {shown.map((lesson) => {
              const allComplete = teacher
                ? lesson.memberCount > 0 &&
                  lesson.completed >= lesson.memberCount
                : lesson.ownComplete;
              const status = !lesson.isPublished
                ? text.draft
                : allComplete
                  ? teacher
                    ? text.complete
                    : text.done
                  : text.issued;
              const base = `/groups/${groupId}/sets/${lesson.id}`;
              return (
                <article
                  key={lesson.id}
                  className="grid items-center gap-3 px-5 py-5 transition hover:bg-paper/40 md:grid-cols-[minmax(0,1fr)_130px_140px_160px] md:gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={base}
                        className="font-semibold text-ink hover:text-navy hover:underline"
                      >
                        {lesson.title}
                      </Link>
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs ${!lesson.isPublished ? "bg-ink/5 text-ink-soft" : allComplete ? "bg-green-50 text-green-800" : "bg-navy-soft text-navy"}`}
                      >
                        {status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-mute">
                      {lesson.trainingMinutes === null
                        ? text.practice
                        : `${text.timed} · ${lesson.trainingMinutes} ${text.minutes}`}
                      {lesson.assignedDate ? ` · ${lesson.assignedDate}` : ""}
                    </p>
                    {lesson.description && (
                      <p className="mt-2 line-clamp-1 text-sm text-ink-soft">
                        {lesson.description}
                      </p>
                    )}
                  </div>
                  <div className="text-xs leading-relaxed text-ink-soft">
                    <span className="mr-3 inline-block md:block">
                      {text.questions}: {lesson.taskCount}
                    </span>
                    {lesson.materialCount > 0 && (
                      <span>
                        {text.materials}: {lesson.materialCount}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-ink-soft">
                    {!lesson.isPublished
                      ? "—"
                      : teacher
                        ? `${text.submitted} ${lesson.completed} ${text.of} ${lesson.memberCount}`
                        : `${lesson.answered}/${lesson.taskCount}`}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={
                        teacher
                          ? base +
                            (lesson.pending
                              ? "?step=results"
                              : lesson.isPublished
                                ? "?step=results"
                                : "?step=content")
                          : base
                      }
                      className={`inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${lesson.pending ? "bg-amber-50 text-amber-900" : "border border-line text-navy hover:bg-navy-soft"}`}
                    >
                      {teacher
                        ? lesson.pending
                          ? `${text.review} ${lesson.pending}`
                          : lesson.isPublished
                            ? text.results
                            : text.resume
                        : allComplete
                          ? text.viewResults
                          : lesson.answered
                            ? text.resume
                            : text.start}
                    </Link>
                    {teacher && lesson.isPublished && (
                      <Link
                        href={base + "?step=content"}
                        title={text.edit}
                        aria-label={`${text.edit}: ${lesson.title}`}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-ink-soft"
                      >
                        ✎
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
      {teacher && lessons.length > 0 && (
        <p className="text-sm text-ink-mute">
          <Link
            href={`/tasks?groupId=${groupId}`}
            className="font-medium text-navy underline underline-offset-4"
          >
            {text.myQuestions}
          </Link>
        </p>
      )}
    </section>
  );
}
