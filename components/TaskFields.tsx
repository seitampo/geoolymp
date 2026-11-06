"use client";

import { useId, useState } from "react";
import {
  FileInput,
  TextArea,
  TextInput,
  inputClasses,
  labelClasses,
} from "@/components/FormFields";
import { MapPointEditor, type MapEditorLabels } from "@/components/MapPoint";

/**
 * Поля задачи, зависящие от её типа. Клиентский компонент: варианты ответов нужны
 * только типам с выбором, редактор карты — только картозадаче. Показывать всё сразу
 * означало бы, что учитель не понимает, какие поля относятся к его задаче.
 *
 * Подписи приходят пропсами: клиентские компоненты строки не переводят сами.
 */

export type TaskFieldsLabels = {
  addOption: string;
  removeOption: string;
  selectCorrect: string;
  type: string;
  typeOptions: { value: string; label: string }[];
  options: string;
  optionsPlaceholder: string;
  correctAnswer: string;
  correctAnswerPlaceholder: string;
  maxScore: string;
  image: string;
  imageHint: string;
  mapImage: string;
  manualReview: string;
};

export type TaskFieldsDefaults = {
  type?: string;
  options?: string;
  correctAnswer?: string;
  maxScore?: number;
  existingImageUrl?: string;
  mapTargetX?: number;
  mapTargetY?: number;
  mapRadius?: number;
  manualReview?: boolean;
};

const CHOICE_TYPES = new Set(["SINGLE_CHOICE", "MULTIPLE_CHOICE"]);

export function TaskFields({
  labels,
  mapLabels,
  defaults = {},
}: {
  labels: TaskFieldsLabels;
  mapLabels: MapEditorLabels;
  defaults?: TaskFieldsDefaults;
}) {
  const [type, setType] = useState(defaults.type ?? "TEXT");
  const [manualReview, setManualReview] = useState(
    defaults.manualReview ??
      Boolean(
        CHOICE_TYPES.has(defaults.type ?? "") &&
          defaults.options &&
          !defaults.correctAnswer,
      ),
  );
  const choiceName = useId();
  const [choices, setChoices] = useState(() => {
    const values = (defaults.options ?? "").split("\n").filter(Boolean);
    return values.length ? values : ["", ""];
  });
  const [selected, setSelected] = useState<number[]>(() =>
    (defaults.options ?? "")
      .split("\n")
      .reduce<number[]>((result, option, index) => {
        if (
          option.trim() &&
          (defaults.correctAnswer ?? "")
            .split(";")
            .map((value) => value.trim())
            .includes(option.trim())
        )
          result.push(index);
        return result;
      }, []),
  );
  const isChoice = CHOICE_TYPES.has(type);
  const isMap = type === "MAP_POINT";

  return (
    <>
      <label className="block">
        <span className={labelClasses}>{labels.type}</span>
        <select
          className={inputClasses}
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          {labels.typeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {isChoice && (
        <fieldset className="grid gap-3 rounded-lg border border-line p-4">
          <legend className="px-1 text-sm font-medium">{labels.options}</legend>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={manualReview}
              onChange={(event) => setManualReview(event.target.checked)}
              className="h-4 w-4 accent-navy"
            />
            {labels.manualReview}
          </label>
          <input
            type="hidden"
            name="manualReview"
            value={manualReview ? "1" : "0"}
          />
          {!manualReview && (
            <p className="text-xs text-ink-mute">{labels.selectCorrect}</p>
          )}
          {choices.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                className="h-5 w-5 shrink-0 accent-navy"
                name={choiceName}
                disabled={manualReview}
                type={type === "MULTIPLE_CHOICE" ? "checkbox" : "radio"}
                checked={(type === "SINGLE_CHOICE"
                  ? selected.slice(0, 1)
                  : selected
                ).includes(index)}
                aria-label={`${labels.correctAnswer}: ${index + 1}`}
                onChange={(event) =>
                  setSelected(
                    type === "SINGLE_CHOICE"
                      ? [index]
                      : event.target.checked
                        ? [...selected, index]
                        : selected.filter((value) => value !== index),
                  )
                }
              />
              <input
                className={`min-w-0 flex-1 ${inputClasses}`}
                value={option}
                required
                aria-label={`${labels.options}: ${index + 1}`}
                onChange={(event) =>
                  setChoices(
                    choices.map((value, i) =>
                      i === index ? event.target.value : value,
                    ),
                  )
                }
              />
              <button
                type="button"
                className="h-11 w-11 shrink-0 rounded-lg border border-line text-lg disabled:opacity-30"
                disabled={choices.length <= 2}
                aria-label={`${labels.removeOption}: ${index + 1}`}
                onClick={() => {
                  setChoices(choices.filter((_, i) => i !== index));
                  setSelected(
                    selected
                      .filter((value) => value !== index)
                      .map((value) => (value > index ? value - 1 : value)),
                  );
                }}
              >
                ×
              </button>
            </div>
          ))}
          <input
            type="hidden"
            name="options"
            value={choices.map((option) => option.trim()).join("\n")}
          />
          <input
            type="hidden"
            name="correctAnswer"
            value={
              manualReview
                ? ""
                : (type === "SINGLE_CHOICE" ? selected.slice(0, 1) : selected)
                    .map((index) => choices[index]?.trim())
                    .filter(Boolean)
                    .join("; ")
            }
          />
          <button
            type="button"
            className="min-h-11 w-fit text-sm font-medium text-navy underline"
            onClick={() => setChoices([...choices, ""])}
          >
            + {labels.addOption}
          </button>
        </fieldset>
      )}

      <TextInput
        label={labels.maxScore}
        name="maxScore"
        step={0.5}
        type="number"
        min={0.5}
        defaultValue={defaults.maxScore}
      />

      {/* Поле файла остаётся всегда: редактор карты слушает именно его. Меняется подпись —
          для картозадачи это сама карта, для остальных типов необязательная иллюстрация. */}
      <FileInput
        label={isMap ? labels.mapImage : labels.image}
        name="image"
        accept="image/*"
        hint={labels.imageHint}
      />

      {isMap && (
        <MapPointEditor
          existingImageUrl={defaults.existingImageUrl}
          initialX={defaults.mapTargetX}
          initialY={defaults.mapTargetY}
          initialRadius={defaults.mapRadius}
          labels={mapLabels}
        />
      )}
    </>
  );
}
