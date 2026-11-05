"use client";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { LessonText } from "@/lib/lessonText";

export function QuestionList({
  setId,
  rows,
  locked,
  text,
}: {
  setId: number;
  rows: { id: number; title: string; detail: string; editor: ReactNode }[];
  locked: boolean;
  text: LessonText;
}) {
  const [order, setOrder] = useState(rows.map((row) => row.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function move(index: number, delta: number) {
    if (busy) return;
    const next = [...order];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setOrder(next);
    setBusy(true);
    setError("");
    const body = new FormData();
    body.set("mode", "reorder");
    next.forEach((id) => body.append("taskId", String(id)));
    try {
      const response = await fetch(`/api/sets/${setId}/tasks`, {
        method: "POST",
        body,
        headers: { Accept: "application/json" },
      });
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(result.error || text.error);
      router.refresh();
    } catch (error) {
      setOrder(order);
      setError(error instanceof Error ? error.message : text.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
        {order.map((id, index) => {
          const row = rows.find((row) => row.id === id)!;
          return (
            <li key={id} className="p-4 sm:px-5">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-paper text-sm font-semibold text-ink-soft">
                  {index + 1}
                </span>
                <details className="min-w-0 flex-1">
                  <summary className="cursor-pointer text-sm font-semibold">
                    <span>{row.title}</span>
                    <span className="mt-1 block text-xs font-normal text-ink-mute">
                      {row.detail}
                    </span>
                  </summary>
                  <div className="pt-2">{row.editor}</div>
                </details>
                {!locked && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      disabled={index === 0 || busy}
                      onClick={() => move(index, -1)}
                      aria-label={`${text.moveUp}: ${row.title}`}
                      className="h-10 w-10 rounded-lg border border-line text-ink-soft disabled:opacity-25"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={index === order.length - 1 || busy}
                      onClick={() => move(index, 1)}
                      aria-label={`${text.moveDown}: ${row.title}`}
                      className="h-10 w-10 rounded-lg border border-line text-ink-soft disabled:opacity-25"
                    >
                      ↓
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {busy && (
        <p role="status" className="mt-2 text-sm text-ink-soft">
          {text.saving}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
