"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SetTaskManager({
  setId,
  available,
  items,
  labels,
}: {
  setId: number;
  available: { id: number; title: string }[];
  items: { id: number; title: string }[];
  labels: {
    add: string;
    selectAll: string;
    selected: string;
    order: string;
    up: string;
    down: string;
    error: string;
    saveOrder: string;
    search: string;
  };
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);
  const [order, setOrder] = useState(items);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const visible = available.filter((task) =>
    task.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  async function save(mode: "add" | "order") {
    setBusy(true);
    setError("");
    const form = new FormData();
    if (mode === "add")
      selected.forEach((id) => form.append("taskId", String(id)));
    else {
      form.set("mode", "reorder");
      order.forEach((task) => form.append("taskId", String(task.id)));
    }
    try {
      const response = await fetch(`/api/sets/${setId}/tasks`, {
        method: "POST",
        body: form,
        headers: { Accept: "application/json" },
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || labels.error);
      setSelected([]);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : labels.error);
    } finally {
      setBusy(false);
    }
  }
  function move(index: number, delta: number) {
    const next = [...order];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setOrder(next);
  }
  return (
    <div className="space-y-4">
      {available.length > 0 && (
        <details className="rounded-xl border border-line bg-white p-5">
          <summary className="cursor-pointer font-semibold">
            {labels.add}
          </summary>
          <div className="mt-4 grid gap-3">
            <input
              className="min-h-11 w-full rounded-lg border border-line px-3"
              aria-label={labels.search}
              placeholder={labels.search}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button
              type="button"
              onClick={() =>
                setSelected(
                  visible.every((task) => selected.includes(task.id))
                    ? selected.filter(
                        (id) => !visible.some((task) => task.id === id),
                      )
                    : [
                        ...new Set([
                          ...selected,
                          ...visible.map((task) => task.id),
                        ]),
                      ],
                )
              }
              className="min-h-11 w-fit text-sm font-medium text-navy underline"
            >
              {labels.selectAll}
            </button>
            <div className="max-h-72 overflow-y-auto">
              {visible.map((task) => (
                <label
                  className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 hover:bg-paper"
                  key={task.id}
                >
                  <input
                    className="h-4 w-4 accent-navy"
                    type="checkbox"
                    checked={selected.includes(task.id)}
                    onChange={(event) =>
                      setSelected(
                        event.target.checked
                          ? [...selected, task.id]
                          : selected.filter((id) => id !== task.id),
                      )
                    }
                  />
                  <span>{task.title}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={busy || !selected.length}
              onClick={() => void save("add")}
              className="min-h-11 w-fit rounded-lg bg-navy px-4 py-2 text-white disabled:opacity-50"
            >
              {labels.add} ({selected.length})
            </button>
          </div>
        </details>
      )}
      {items.length > 1 && (
        <details className="rounded-xl border border-line bg-white p-5">
          <summary className="cursor-pointer font-semibold">
            {labels.order}
          </summary>
          <ol className="my-4 divide-y divide-line">
            {order.map((task, index) => (
              <li key={task.id} className="flex items-center gap-3 py-2">
                <span className="text-xs text-ink-mute">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {task.title}
                </span>
                <button
                  type="button"
                  disabled={index === 0 || busy}
                  aria-label={`${labels.up}: ${task.title}`}
                  onClick={() => move(index, -1)}
                  className="h-11 w-11 rounded-lg border border-line disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === order.length - 1 || busy}
                  aria-label={`${labels.down}: ${task.title}`}
                  onClick={() => move(index, 1)}
                  className="h-11 w-11 rounded-lg border border-line disabled:opacity-30"
                >
                  ↓
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            disabled={
              busy || order.every((task, i) => task.id === items[i]?.id)
            }
            onClick={() => void save("order")}
            className="min-h-11 rounded-lg bg-navy px-4 text-white disabled:opacity-50"
          >
            {labels.saveOrder}
          </button>
        </details>
      )}
      {error && (
        <p
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
