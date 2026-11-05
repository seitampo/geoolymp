"use client";
import { useState, type ReactNode } from "react";
import type { LessonText } from "@/lib/lessonText";
export function QuestionBank({
  items,
  text,
}: {
  items: { id: number; title: string; detail: string; editor: ReactNode }[];
  text: LessonText;
}) {
  const [query, setQuery] = useState("");
  const shown = items.filter((item) =>
    (item.title + " " + item.detail)
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  );
  return (
    <div className="space-y-4">
      <input
        className="min-h-12 w-full rounded-lg border border-line bg-white px-4 text-sm"
        aria-label={text.searchBank}
        placeholder={text.searchBank}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="divide-y divide-line rounded-xl border border-line bg-white">
        {shown.map((item) => (
          <details key={item.id} className="p-5">
            <summary className="cursor-pointer text-sm font-semibold">
              {item.title}
              <span className="mt-1 block text-xs font-normal text-ink-mute">
                {item.detail}
              </span>
            </summary>
            {item.editor}
          </details>
        ))}
        {!shown.length && (
          <p className="p-6 text-sm text-ink-soft">
            {items.length ? text.noMatches : text.emptyBank}
          </p>
        )}
      </div>
    </div>
  );
}
