import type { MapAnswerLabels, MapEditorLabels } from "@/components/MapPoint";
import type { TFunction } from "./i18n";

// Подписи для клиентского компонента MapPoint собираем на сервере и передаём пропсами
// (клиентские компоненты строки не переводят сами — см. этап A i18n).
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
