import type { TFunction } from "./i18n";

export function workspaceLabels(t: TFunction) {
  return {
    navigation: t("ui.navigation"),
    previous: t("ui.previous"),
    next: t("ui.next"),
    task: t("setPage.taskWord"),
    of: t("stats.of"),
    solved: t("ui.solvedShort"),
    statuses: {
      "not-submitted": t("taskStatus.notSubmitted"),
      pending: t("taskStatus.pending"),
      solved: t("taskStatus.solved"),
      partial: t("taskStatus.partial"),
      wrong: t("taskStatus.wrong"),
    },
  };
}

export function editorLabels(t: TFunction) {
  return {
    answer: t("answerForm.answer"),
    file: t("answerForm.file"),
    image: t("answerForm.image"),
    comment: t("answerForm.fileComment"),
    submit: t("answerForm.submit"),
    draft: t("ui.draft"),
    saving: t("ui.saving"),
    saved: t("ui.saved"),
    error: t("ui.saveError"),
    retry: t("ui.retry"),
    sending: t("ui.sending"),
    sent: t("ok.answerSubmitted"),
    pending: t("student.notChecked"),
    score: t("student.score"),
    of: t("stats.of"),
    fileHint: t("ui.fileHint"),
    storageError: t("ui.storageError"),
  };
}
