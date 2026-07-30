"use client";

import { useState } from "react";
import { FileInput, TextArea, TextInput, inputClasses, labelClasses } from "@/components/FormFields";
import { MapPointEditor, type MapEditorLabels } from "@/components/MapPoint";

/**
 * Поля задачи, зависящие от её типа. Клиентский компонент: варианты ответов нужны
 * только типам с выбором, редактор карты — только картозадаче. Показывать всё сразу
 * означало бы, что учитель не понимает, какие поля относятся к его задаче.
 *
 * Подписи приходят пропсами: клиентские компоненты строки не переводят сами.
 */

export type TaskFieldsLabels = {
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
        <>
          <TextArea
            label={labels.options}
            name="options"
            required={false}
            placeholder={labels.optionsPlaceholder}
            defaultValue={defaults.options}
          />
          <TextInput
            label={labels.correctAnswer}
            name="correctAnswer"
            required={false}
            placeholder={labels.correctAnswerPlaceholder}
            defaultValue={defaults.correctAnswer}
          />
        </>
      )}

      <TextInput
        label={labels.maxScore}
        name="maxScore"
        type="number"
        min={1}
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
