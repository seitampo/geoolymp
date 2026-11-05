"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LessonText } from "@/lib/lessonText";

export function ItemPicker({
  title,
  hint,
  items,
  action,
  field,
  mode,
  text,
}: {
  title: string;
  hint: string;
  items: { id: number; title: string; detail: string }[];
  action: string;
  field: string;
  mode?: string;
  text: LessonText;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const shown = items.filter((item) =>
    (item.title + " " + item.detail)
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  );
  async function add() {
    if (!selected.length || busy) return;
    setBusy(true);
    setError("");
    const form = new FormData();
    selected.forEach((id) => form.append(field, String(id)));
    if (mode) form.set("mode", mode);
    try {
      const response = await fetch(action, {
        method: "POST",
        body: form,
        headers: { Accept: "application/json" },
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || text.error);
      dialog.current?.close();
      setSelected([]);
      setQuery("");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : text.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          dialog.current?.showModal();
        }}
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-navy hover:bg-navy-soft"
      >
        {title}
      </button>
      <dialog
        ref={dialog}
        className="m-auto max-h-[calc(100vh_-_2rem)] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 text-ink shadow-xl backdrop:bg-ink/40 sm:p-6"
        aria-label={title}
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            disabled={busy}
            onClick={() => dialog.current?.close()}
            aria-label={text.close}
            className="h-9 w-9 shrink-0 rounded-lg border border-line text-xl"
          >
            ×
          </button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{hint}</p>
        {items.length ? (
          <>
            <input
              autoFocus
              aria-label={text.searchBank}
              placeholder={text.searchBank}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="mt-5 min-h-11 w-full rounded-lg border border-line px-3"
            />
            <div className="my-3 flex items-center justify-between gap-2 text-xs text-ink-mute">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  setSelected(
                    shown.every((item) => selected.includes(item.id))
                      ? selected.filter(
                          (id) => !shown.some((item) => item.id === id),
                        )
                      : [
                          ...new Set([
                            ...selected,
                            ...shown.map((item) => item.id),
                          ]),
                        ],
                  )
                }
                className="min-h-10 font-medium text-navy underline"
              >
                {shown.every((item) => selected.includes(item.id)) &&
                shown.length
                  ? text.clearAll
                  : text.chooseAll}
              </button>
              <span>
                {text.selected}: {selected.length}
              </span>
            </div>
            <div className="max-h-80 divide-y divide-line overflow-y-auto rounded-lg border border-line">
              {shown.map((item) => (
                <label
                  className={`flex cursor-pointer items-start gap-3 px-3 py-3 ${selected.includes(item.id) ? "bg-navy-soft" : "hover:bg-paper"}`}
                  key={item.id}
                >
                  <input
                    disabled={busy}
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 accent-navy"
                    checked={selected.includes(item.id)}
                    onChange={(event) =>
                      setSelected(
                        event.target.checked
                          ? [...selected, item.id]
                          : selected.filter((id) => id !== item.id),
                      )
                    }
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-xs text-ink-mute">
                      {item.detail}
                    </span>
                  </span>
                </label>
              ))}
              {!shown.length && (
                <p className="p-5 text-sm text-ink-soft">{text.noMatches}</p>
              )}
            </div>
          </>
        ) : (
          <p className="my-7 rounded-lg bg-paper p-4 text-sm text-ink-soft">
            {text.emptyBank}
          </p>
        )}
        {error && (
          <p
            className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => dialog.current?.close()}
            className="min-h-11 rounded-lg border border-line px-4 text-sm"
          >
            {text.cancel}
          </button>
          <button
            type="button"
            disabled={busy || !selected.length}
            onClick={() => void add()}
            className="min-h-11 rounded-lg bg-navy px-5 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? text.saving : `${text.addSelected} (${selected.length})`}
          </button>
        </div>
      </dialog>
    </>
  );
}
