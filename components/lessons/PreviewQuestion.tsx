"use client";
import { useState } from "react";
import {
  AnswerFields,
  type AnswerTask,
  type EditorLabels,
} from "@/components/AnswerEditor";
import type { MapAnswerLabels } from "@/components/MapPoint";
export function PreviewQuestion({
  task,
  labels,
  mapLabels,
}: {
  task: AnswerTask & { title: string; description: string; maxScore: number };
  labels: EditorLabels;
  mapLabels: MapAnswerLabels;
}) {
  const [answer, setAnswer] = useState("");
  return (
    <article className="rounded-xl border border-line bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">{task.title}</h2>
        <span className="text-xs text-ink-mute">
          {labels.score}: {task.maxScore}
        </span>
      </div>
      <p className="my-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
        {task.description}
      </p>
      {task.imageUrl && task.type !== "MAP_POINT" && (
        <img
          className="mb-4 max-h-80 rounded-lg border border-line object-contain"
          src={task.imageUrl}
          alt={task.title}
        />
      )}
      <form onSubmit={(event) => event.preventDefault()}>
        <AnswerFields
          task={task}
          answer={answer}
          onChange={setAnswer}
          labels={labels}
          mapLabels={mapLabels}
        />
      </form>
    </article>
  );
}
