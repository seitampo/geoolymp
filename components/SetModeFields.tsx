"use client";

import { useState } from "react";
import { TextInput, inputClasses, labelClasses } from "@/components/FormFields";

/**
 * Режим подборки. Два разных инструмента, и выбор должен быть явным:
 *  - сборник — тематический список задач, решать можно сколько угодно раз;
 *  - пробная олимпиада — таймер, одна попытка, задачи открываются только после старта.
 *
 * Лимит времени и есть признак олимпиады (TaskSet.trainingMinutes): у сборника поле
 * не отображается и уходит пустым, сервер сохраняет null. Отдельного поля в базе
 * не нужно — иначе появились бы два источника правды.
 */

export type SetModeLabels = {
  mode: string;
  collection: string;
  olympiad: string;
  collectionHint: string;
  olympiadHint: string;
  minutes: string;
};

const DEFAULT_MINUTES = 30;

export function SetModeFields({
  labels,
  defaultMinutes = null,
}: {
  labels: SetModeLabels;
  defaultMinutes?: number | null;
}) {
  const [isOlympiad, setIsOlympiad] = useState(defaultMinutes !== null);

  return (
    <>
      <fieldset>
        <legend className={labelClasses}>{labels.mode}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {[false, true].map((timed) => (
            <label
              key={String(timed)}
              className={[
                "flex cursor-pointer items-start gap-3 rounded-xl border p-4",
                isOlympiad === timed
                  ? "border-navy bg-navy-soft ring-1 ring-navy"
                  : "border-line bg-white",
              ].join(" ")}
            >
              <input
                type="radio"
                name="lessonMode"
                value={timed ? "timed" : "practice"}
                checked={isOlympiad === timed}
                onChange={() => setIsOlympiad(timed)}
                className="mt-1 h-4 w-4 shrink-0 accent-navy"
              />
              <span>
                <span className="block text-sm font-semibold">
                  {timed ? labels.olympiad : labels.collection}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
                  {timed ? labels.olympiadHint : labels.collectionHint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {isOlympiad && (
        <TextInput
          label={labels.minutes}
          name="trainingMinutes"
          type="number"
          min={1}
          max={600}
          defaultValue={defaultMinutes ?? DEFAULT_MINUTES}
        />
      )}
    </>
  );
}
