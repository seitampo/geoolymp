"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MapAnswerInput, type MapAnswerLabels } from "./MapPoint";
import { inputClasses } from "./FormFields";

export type AnswerTask = {
  id: number;
  type: string;
  options: string[];
  imageUrl?: string;
};
export type EditorLabels = {
  answer: string;
  file: string;
  image: string;
  comment: string;
  submit: string;
  draft: string;
  saving: string;
  saved: string;
  error: string;
  retry: string;
  sending: string;
  sent: string;
  pending: string;
  score: string;
  of: string;
  fileHint: string;
  storageError: string;
};

export function AnswerFields({
  task,
  answer,
  onChange,
  labels,
  mapLabels,
  hasFile = false,
}: {
  task: AnswerTask;
  answer: string;
  onChange: (value: string) => void;
  labels: EditorLabels;
  mapLabels: MapAnswerLabels;
  hasFile?: boolean;
}) {
  if (task.type === "MAP_POINT" && task.imageUrl)
    return (
      <MapAnswerInput
        imageUrl={task.imageUrl}
        value={answer}
        onChange={onChange}
        labels={mapLabels}
      />
    );
  if (task.type === "SINGLE_CHOICE" || task.type === "MULTIPLE_CHOICE") {
    const multiple = task.type === "MULTIPLE_CHOICE";
    const chosen = multiple
      ? answer
          .split(";")
          .map((value) => value.trim())
          .filter(Boolean)
      : [answer];
    return (
      <fieldset className="grid gap-2">
        <legend className="sr-only">{labels.answer}</legend>
        {task.options.map((option) => (
          <label
            key={option}
            className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition ${chosen.includes(option) ? "border-navy bg-navy-soft" : "border-line bg-white hover:border-navy/40"}`}
          >
            <input
              className="h-4 w-4 shrink-0 accent-navy"
              type={multiple ? "checkbox" : "radio"}
              name="answer"
              value={option}
              required={!multiple}
              checked={chosen.includes(option)}
              onChange={(event) =>
                onChange(
                  multiple
                    ? (event.target.checked
                        ? [...chosen, option]
                        : chosen.filter((value) => value !== option)
                      ).join("; ")
                    : option,
                )
              }
            />
            <span>{option}</span>
          </label>
        ))}
      </fieldset>
    );
  }
  const upload = task.type === "IMAGE_UPLOAD" || task.type === "FILE_UPLOAD";
  return (
    <>
      {upload && (
        <label className="block text-sm font-medium">
          {task.type === "IMAGE_UPLOAD" ? labels.image : labels.file}
          <input
            className={`mt-2 block w-full ${inputClasses}`}
            name="file"
            type="file"
            accept={
              task.type === "IMAGE_UPLOAD" ? ".jpg,.jpeg,.png,.webp" : undefined
            }
            required={!hasFile}
          />
          <span className="mt-1 block text-xs font-normal text-ink-mute">
            {labels.fileHint}
          </span>
        </label>
      )}
      <label className="block text-sm font-medium">
        {upload ? labels.comment : labels.answer}
        <textarea
          className={`mt-2 block min-h-32 w-full ${inputClasses}`}
          name="answer"
          value={answer}
          onChange={(event) => onChange(event.target.value)}
          required={!upload}
        />
      </label>
    </>
  );
}

export function AnswerEditor({
  task,
  initialAnswer = "",
  userId,
  action,
  returnTo,
  hasFile,
  labels,
  mapLabels,
}: {
  task: AnswerTask;
  initialAnswer?: string;
  userId: number;
  action: string;
  returnTo?: string;
  hasFile?: boolean;
  labels: EditorLabels;
  mapLabels: MapAnswerLabels;
}) {
  const router = useRouter();
  const key = `geoolymp:draft:${userId}:${task.id}`;
  const [answer, setAnswer] = useState(initialAnswer);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    feedback: string;
    maxScore: number;
  } | null>(null);
  const submitting = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const draft = JSON.parse(raw);
        if (
          draft.baseline === initialAnswer &&
          typeof draft.answer === "string"
        )
          setAnswer(draft.answer);
        else localStorage.removeItem(key);
      }
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (!ready) return;
    try {
      if (answer === initialAnswer) localStorage.removeItem(key);
      else
        localStorage.setItem(
          key,
          JSON.stringify({ answer, baseline: initialAnswer }),
        );
    } catch {
      setStorageError(true);
    }
  }, [answer, initialAnswer, key, ready]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setFailed(false);
    setMessage("");
    try {
      const response = await fetch(action, {
        method: "POST",
        body: new FormData(event.currentTarget),
        headers: { Accept: "application/json" },
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || labels.error);
      try {
        localStorage.removeItem(key);
      } catch {
        /* A successful submission is already safe on the server. */
      }
      if (data.review) setResult({ ...data.review, maxScore: data.maxScore });
      setMessage(data.review ? labels.sent : labels.pending);
      router.refresh();
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : labels.error);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      action={action}
      method="post"
      encType="multipart/form-data"
      onSubmit={submit}
      className="grid gap-4"
    >
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <AnswerFields
        task={task}
        answer={answer}
        onChange={setAnswer}
        labels={labels}
        mapLabels={mapLabels}
        hasFile={hasFile}
      />
      {storageError && (
        <p role="status" className="text-xs text-amber-800">
          {labels.storageError}
        </p>
      )}
      {!storageError && ready && answer !== initialAnswer && (
        <p className="text-xs text-ink-mute">{labels.draft}</p>
      )}
      {message && (
        <div
          role={failed ? "alert" : "status"}
          className={`rounded-lg px-4 py-3 text-sm ${failed ? "bg-red-50 text-red-800" : "bg-green-50 text-green-900"}`}
        >
          {message}
          {result && !failed && (
            <p className="mt-1 font-medium">
              {labels.score}: {result.score} {labels.of} {result.maxScore}.{" "}
              {result.feedback}
            </p>
          )}
        </div>
      )}
      <button
        type="submit"
        disabled={busy}
        className="min-h-11 w-fit rounded-lg bg-navy px-5 py-2.5 font-medium text-white disabled:opacity-60"
      >
        {busy ? labels.sending : failed ? labels.retry : labels.submit}
      </button>
    </form>
  );
}
