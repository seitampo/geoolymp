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
      <label className="block">
        <span className={labelClasses}>{labels.mode}</span>
        <select
          className={inputClasses}
          value={isOlympiad ? "olympiad" : "collection"}
          onChange={(event) => setIsOlympiad(event.target.value === "olympiad")}
        >
          <option value="collection">{labels.collection}</option>
          <option value="olympiad">{labels.olympiad}</option>
        </select>
        <span className="mt-1 block text-xs text-ink-mute">
          {isOlympiad ? labels.olympiadHint : labels.collectionHint}
        </span>
      </label>

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
