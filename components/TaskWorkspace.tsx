"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { StudentTaskStatus } from "@/lib/taskStatus";

export type WorkspaceLabels = {
  navigation: string;
  previous: string;
  next: string;
  task: string;
  of: string;
  solved: string;
  statuses: Record<StudentTaskStatus, string>;
};
const colors: Record<StudentTaskStatus, string> = {
  solved: "bg-green-50 text-green-800 border-green-200",
  partial: "bg-amber-50 text-amber-900 border-amber-200",
  wrong: "bg-red-50 text-red-800 border-red-200",
  pending: "bg-navy-soft text-navy border-navy/20",
  "not-submitted": "bg-white text-ink-soft border-line",
};

export function TaskWorkspace({
  tasks,
  children,
  labels,
}: {
  tasks: {
    id: number;
    title: string;
    status: StudentTaskStatus;
    unseen?: boolean;
  }[];
  children: ReactNode[];
  labels: WorkspaceLabels;
}) {
  const [activeId, setActiveId] = useState(
    tasks.find((task) => task.status !== "solved")?.id ?? tasks[0]?.id,
  );
  const [restored, setRestored] = useState(false);
  const navigationRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = navigationRef.current;
    const selected = list?.querySelector<HTMLButtonElement>(
      '[aria-current="step"]',
    );
    if (list && selected)
      list.scrollTop = Math.max(
        0,
        selected.offsetTop - (list.clientHeight - selected.clientHeight) / 2,
      );
  }, [activeId]);
  useEffect(() => {
    const id = Number(window.location.hash.replace("#task-", ""));
    if (tasks.some((task) => task.id === id)) setActiveId(id);
    setRestored(true);
  }, []); // Restore deep links once; refreshes must keep the chosen task.
  const index = Math.max(
    0,
    tasks.findIndex((task) => task.id === activeId),
  );
  const active = tasks[index];
  useEffect(() => {
    if (restored && active?.unseen)
      void fetch(`/api/tasks/${active.id}/seen`, { method: "POST" }).catch(
        () => undefined,
      );
  }, [active?.id, active?.unseen, restored]);
  if (!active) return null;
  function choose(id: number) {
    setActiveId(id);
    window.history.replaceState(null, "", `#task-${id}`);
  }
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <nav
        aria-label={labels.navigation}
        className="rounded-xl border border-line bg-white p-4 lg:sticky lg:top-24"
      >
        <div className="mb-3 flex items-center justify-between gap-2 text-sm">
          <span className="font-semibold">{labels.navigation}</span>
          <span className="text-ink-mute">
            {tasks.filter((task) => task.status === "solved").length}/
            {tasks.length} {labels.solved}
          </span>
        </div>
        <div
          ref={navigationRef}
          className="relative flex max-h-36 flex-wrap gap-2 overflow-y-auto overscroll-contain p-1 lg:grid lg:max-h-[calc(100dvh-12rem)] lg:grid-cols-1"
        >
          {tasks.map((task, i) => (
            <button
              key={task.id}
              type="button"
              onClick={() => choose(task.id)}
              aria-current={active.id === task.id ? "step" : undefined}
              title={`${task.title}: ${labels.statuses[task.status]}`}
              className={`flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm ${colors[task.status]} ${active.id === task.id ? "ring-2 ring-navy ring-offset-2" : "hover:border-navy/40"}`}
            >
              <span className="font-semibold tabular-nums">{i + 1}</span>
              <span className="hidden min-w-0 lg:block">
                <span className="block truncate font-medium">{task.title}</span>
                <span className="text-xs opacity-80">
                  {labels.statuses[task.status]}
                </span>
              </span>
            </button>
          ))}
        </div>
      </nav>
      <div className="min-w-0 space-y-4">
        <p className="text-sm text-ink-mute">
          {labels.task} {index + 1} {labels.of} {tasks.length}
        </p>
        {tasks.map((task, i) => (
          <div key={task.id} hidden={task.id !== active.id}>
            {children[i]}
          </div>
        ))}
        <div className="flex justify-between gap-3">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => choose(tasks[index - 1].id)}
            className="min-h-11 rounded-lg border border-line bg-white px-4 py-2 disabled:opacity-40"
          >
            ← {labels.previous}
          </button>
          <button
            type="button"
            disabled={index === tasks.length - 1}
            onClick={() => choose(tasks[index + 1].id)}
            className="min-h-11 rounded-lg bg-navy px-4 py-2 text-white disabled:opacity-40"
          >
            {labels.next} →
          </button>
        </div>
      </div>
    </div>
  );
}
