import type { MapAnswerLabels, MapEditorLabels } from "@/components/MapPoint";
import type { SetModeLabels } from "@/components/SetModeFields";
import type { TaskFieldsLabels } from "@/components/TaskFields";
import type { TFunction, TranslationKey } from "./i18n";
import { taskTypes } from "./tasks";
import { maxUploadLabel } from "./uploads";

// Подписи для всех клиентских компонентов собираем здесь, на сервере, и передаём
// пропсами: клиентские компоненты строки не переводят сами (см. этап A i18n).
// Файл начинался с карты, отсюда имя; сейчас тут подписи и для полей задачи, и для
// режима подборки.
export function mapEditorLabels(t: TFunction): MapEditorLabels {
  return {
    title: t("map.editorTitle"),
    hint: t("map.editorHint"),
    alt: t("map.alt"),
    placeholder: t("map.placeholder"),
    tolerance: t("map.tolerancePre"),
    toleranceSuffix: t("map.toleranceSuffix"),
  };
}

export function mapAnswerLabels(t: TFunction): MapAnswerLabels {
  return {
    clickToAnswer: t("map.clickToAnswer"),
    clickToMove: t("map.clickToMove"),
    alt: t("map.alt"),
  };
}

/**
 * Подписи для полей задачи (клиентский компонент TaskFields).
 * `imageLabel` разный у создания и редактирования: «Изображение к условию» против
 * «Новое изображение».
 */
export function taskFieldsLabels(t: TFunction, imageLabel: string): TaskFieldsLabels {
  return {
    type: t("taskForm.typeLabel"),
    typeOptions: taskTypes.map((type) => ({
      value: type.value,
      label: t(`taskType.${type.value}` as TranslationKey),
    })),
    options: t("task.options"),
    optionsPlaceholder: t("task.optionsPlaceholder"),
    correctAnswer: t("task.correctAnswer"),
    correctAnswerPlaceholder: t("task.correctAnswerPlaceholder"),
    maxScore: t("task.maxScore"),
    image: imageLabel,
    imageHint: `${t("task.imageHintPrefix")} ${maxUploadLabel()}`,
    mapImage: t("task.mapImage"),
  };
}

/** Подписи выбора режима подборки (клиентский компонент SetModeFields). */
export function setModeLabels(t: TFunction): SetModeLabels {
  return {
    mode: t("set.mode"),
    collection: t("set.modeCollection"),
    olympiad: t("set.modeOlympiad"),
    collectionHint: t("set.modeCollectionHint"),
    olympiadHint: t("set.modeOlympiadHint"),
    minutes: t("set.trainingMinutes"),
  };
}
