"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnswerFields,
  type AnswerTask,
  type EditorLabels,
} from "./AnswerEditor";
import type { MapAnswerLabels } from "./MapPoint";
import { TrainingTimer } from "./TrainingTimer";
import type { WorkspaceLabels } from "./TaskWorkspace";
import { canonicalAnswer } from "@/lib/answerValue";

type TrainingTask = AnswerTask & {
  title: string;
  description: string;
  maxScore: number;
};
export function TrainingSession({
  attemptId,
  expiresAt,
  tasks,
  initialAnswers,
  title,
  labels,
  mapLabels,
  workspace,
  finishLabel,
  confirmLabel,
  cancelLabel,
  warning,
}: {
  attemptId: number;
  expiresAt: string;
  tasks: TrainingTask[];
  initialAnswers: Record<string, string>;
  title: string;
  labels: EditorLabels;
  mapLabels: MapAnswerLabels;
  workspace: WorkspaceLabels;
  finishLabel: string;
  confirmLabel: string;
  cancelLabel: string;
  warning: string;
}) {
  const [answers, setAnswers] = useState(initialAnswers);
  const current = useRef(initialAnswers);
  const saved = useRef(initialAnswers);
  const inflight = useRef<Promise<boolean> | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<"saved" | "dirty" | "saving" | "error">(
    "saved",
  );
  const [storageError, setStorageError] = useState(false);
  const [active, setActive] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const finished = useRef(false);
  const finishingRequest = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (confirm && !dialog.current?.open) dialog.current?.showModal();
    else if (!confirm && dialog.current?.open) dialog.current.close();
  }, [confirm]);
  const key = `geoolymp:training:${attemptId}`;
  const dirty = useCallback(
    () =>
      tasks.filter(
        (task) =>
          canonicalAnswer(task.type, current.current[task.id] ?? "") !==
          canonicalAnswer(task.type, saved.current[task.id] ?? ""),
      ),
    [tasks],
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const draft = JSON.parse(raw);
        const restored = { ...initialAnswers };
        for (const task of tasks) {
          if (
            typeof draft.answers?.[task.id] === "string" &&
            canonicalAnswer(task.type, draft.server?.[task.id] ?? "") ===
              canonicalAnswer(task.type, initialAnswers[task.id] ?? "")
          )
            restored[task.id] = draft.answers[task.id];
        }
        current.current = restored;
        setAnswers(restored);
        if (dirty().length) setStatus("dirty");
      }
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, []);

  const flush = useCallback(async (): Promise<boolean> => {
    if (inflight.current) {
      const ok = await inflight.current;
      return ok ? flush() : false;
    }
    const changed = dirty();
    if (!changed.length) return true;
    const snapshot = Object.fromEntries(
      changed.map((task) => [
        task.id,
        canonicalAnswer(task.type, current.current[task.id] ?? ""),
      ]),
    );
    setStatus("saving");
    inflight.current = (async () => {
      try {
        const response = await fetch(`/api/training/${attemptId}/answers`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            answers: changed.map((task) => ({
              taskId: task.id,
              answer: snapshot[task.id],
            })),
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error();
        saved.current = { ...saved.current, ...snapshot };
        setStatus(dirty().length ? "dirty" : "saved");
        return true;
      } catch {
        setStatus("error");
        return false;
      } finally {
        inflight.current = null;
      }
    })();
    return inflight.current;
  }, [attemptId, dirty]);

  useEffect(() => {
    if (!ready) return;
    try {
      if (!dirty().length) localStorage.removeItem(key);
      else
        localStorage.setItem(
          key,
          JSON.stringify({ answers, server: saved.current }),
        );
    } catch {
      setStorageError(true);
    }
    if (!dirty().length || status === "error") return;
    const timeout = setTimeout(() => void flush(), 600);
    return () => clearTimeout(timeout);
  }, [answers, ready, key, dirty, flush, status]);
  useEffect(() => {
    const online = () => void flush();
    const unload = (event: BeforeUnloadEvent) => {
      if (!finished.current && dirty().length) event.preventDefault();
    };
    window.addEventListener("online", online);
    window.addEventListener("beforeunload", unload);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("beforeunload", unload);
    };
  }, [flush, dirty]);

  const finish = useCallback(
    async (expired = false) => {
      if (finished.current || finishingRequest.current) return;
      finishingRequest.current = true;
      setFinishing(true);
      if (!expired && !(await flush())) {
        setFinishing(false);
        finishingRequest.current = false;
        setConfirm(false);
        return;
      }
      // Flush again if an edit arrived while the previous request was in flight.
      if (!expired && dirty().length && !(await flush())) {
        setFinishing(false);
        finishingRequest.current = false;
        return;
      }
      try {
        const response = await fetch(`/api/training/${attemptId}/finish`, {
          method: "POST",
          headers: { Accept: "application/json" },
        });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error();
        finished.current = true;
        try {
          localStorage.removeItem(key);
        } catch {
          /* Finished answers are on the server. */
        }
        window.location.assign(data.redirectTo);
      } catch {
        setStatus("error");
        finishingRequest.current = false;
        setFinishing(false);
        setConfirm(false);
      }
    },
    [attemptId, dirty, flush, key],
  );
  const task = tasks[active];
  const answered = tasks.filter((task) =>
    (answers[task.id] ?? "").trim(),
  ).length;
  return (
    <div className="space-y-5">
      <div className="sticky top-[65px] z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="min-w-0">
          <h1 className="truncate font-semibold">{title}</h1>
          <p className="mt-1 text-xs text-ink-mute">
            {answered}/{tasks.length} ·{" "}
            <span role="status">
              {status === "error"
                ? labels.error
                : status === "saving" || status === "dirty"
                  ? labels.saving
                  : labels.saved}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TrainingTimer
            expiresAt={expiresAt}
            onExpire={() => void finish(true)}
          />
          <button
            type="button"
            disabled={finishing}
            onClick={() => setConfirm(true)}
            className="min-h-11 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {finishing ? labels.sending : finishLabel}
          </button>
        </div>
      </div>
      <p className="text-sm text-ink-soft">{warning}</p>
      {storageError && (
        <p className="text-sm text-amber-800" role="status">
          {labels.storageError}
        </p>
      )}
      {status === "error" && (
        <div
          className="flex flex-wrap items-center gap-3 rounded-lg bg-red-50 p-4 text-red-800"
          role="alert"
        >
          <span>{labels.error}</span>
          <button
            className="min-h-11 font-semibold underline"
            onClick={() => void flush()}
            type="button"
          >
            {labels.retry}
          </button>
        </div>
      )}
      <nav aria-label={workspace.navigation} className="flex flex-wrap gap-2">
        {tasks.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(i)}
            aria-current={i === active ? "step" : undefined}
            title={item.title}
            className={`h-11 min-w-11 rounded-lg border px-3 font-medium ${i === active ? "border-navy bg-navy text-white" : answers[item.id] ? "border-green-200 bg-green-50 text-green-800" : "border-line bg-white"}`}
          >
            {i + 1}
          </button>
        ))}
      </nav>
      {task && (
        <article
          className="rounded-xl border border-line bg-white p-5 sm:p-7"
          aria-label={`${workspace.task} ${active + 1}`}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-mute">
            <span>
              {workspace.task} {active + 1} {workspace.of} {tasks.length}
            </span>
            <span>
              {labels.score}: {task.maxScore}
            </span>
          </div>
          <h2 className="text-lg font-semibold">{task.title}</h2>
          <p className="my-4 whitespace-pre-wrap leading-relaxed text-ink-soft">
            {task.description}
          </p>
          {task.imageUrl && task.type !== "MAP_POINT" && (
            <img
              src={task.imageUrl}
              alt={task.title}
              className="mb-4 max-h-80 max-w-full rounded-lg object-contain"
            />
          )}
          <fieldset disabled={finishing} className="grid gap-3">
            <AnswerFields
              key={task.id}
              task={task}
              answer={answers[task.id] ?? ""}
              onChange={(value) => {
                const next = { ...current.current, [task.id]: value };
                current.current = next;
                setAnswers(next);
                setStatus("dirty");
              }}
              labels={labels}
              mapLabels={mapLabels}
            />
          </fieldset>
        </article>
      )}
      <div className="flex justify-between gap-3">
        <button
          type="button"
          disabled={active === 0}
          onClick={() => setActive(active - 1)}
          className="min-h-11 rounded-lg border border-line bg-white px-4 disabled:opacity-40"
        >
          ← {workspace.previous}
        </button>
        <button
          type="button"
          disabled={active >= tasks.length - 1}
          onClick={() => setActive(active + 1)}
          className="min-h-11 rounded-lg border border-line bg-white px-4 disabled:opacity-40"
        >
          {workspace.next} →
        </button>
      </div>
      <dialog
        ref={dialog}
        aria-labelledby="finish-confirm"
        onCancel={() => setConfirm(false)}
        className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl bg-white p-6 text-ink shadow-xl backdrop:bg-ink/40"
      >
        <h2 id="finish-confirm" className="text-lg font-semibold">
          {confirmLabel}
        </h2>
        <p className="my-4 text-ink-soft">
          {answered} {workspace.of} {tasks.length}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={finishing}
            onClick={() => void finish()}
            className="min-h-11 rounded-lg bg-navy px-4 text-white disabled:opacity-50"
          >
            {finishing ? labels.sending : finishLabel}
          </button>
          <button
            type="button"
            disabled={finishing}
            onClick={() => setConfirm(false)}
            className="min-h-11 rounded-lg border border-line px-4"
          >
            {cancelLabel}
          </button>
        </div>
      </dialog>
    </div>
  );
}
