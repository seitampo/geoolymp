import type { Task } from "@prisma/client";
import { TaskFields } from "./TaskFields";
import { FileInput, TextArea, TextInput } from "./FormFields";
import { Button } from "./Button";
import { getT } from "@/lib/i18n";
import { mapEditorLabels, taskFieldsLabels } from "@/lib/mapLabels";
import { maxUploadLabel } from "@/lib/uploads";
import { ActionForm } from "./ActionForm";

export async function TaskForm({
  groupId,
  setId,
  task,
  returnTo,
  training = false,
}: {
  groupId: number;
  setId?: number;
  task?: Task;
  returnTo?: string;
  training?: boolean;
}) {
  const t = await getT();
  const fields = taskFieldsLabels(t, t("task.image"));
  if (training)
    fields.typeOptions = fields.typeOptions.filter(
      (option) => !["IMAGE_UPLOAD", "FILE_UPLOAD"].includes(option.value),
    );
  return (
    <ActionForm
      savingLabel={t("ui.saving")}
      successLabel={t(task ? "ui.changesSaved" : "ok.taskCreated")}
      resetOnSuccess={!task}
      errorLabel={t("ui.genericError")}
      action={
        task ? `/api/tasks/${task.id}/update` : `/api/groups/${groupId}/tasks`
      }
    >
      {setId && <input type="hidden" name="setId" value={setId} />}
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <TextInput
        label={t("field.title")}
        name="title"
        defaultValue={task?.title}
      />
      <TextArea
        label={t("task.condition")}
        name="description"
        defaultValue={task?.description}
      />
      <TaskFields
        labels={fields}
        mapLabels={mapEditorLabels(t)}
        defaults={{
          type: task?.type,
          options: task?.options ?? "",
          correctAnswer: task?.correctAnswer ?? "",
          maxScore: task?.maxScore ?? 5,
          existingImageUrl: task?.imagePath
            ? `/api/tasks/${task.id}/image`
            : undefined,
          mapTargetX: task?.mapTargetX ?? undefined,
          mapTargetY: task?.mapTargetY ?? undefined,
          mapRadius: task?.mapRadius ?? undefined,
        }}
      />
      <details
        className="rounded-lg border border-line p-4"
        open={Boolean(task?.explanationText)}
      >
        <summary className="cursor-pointer font-medium">
          {t("explanation.summary")}
        </summary>
        <div className="mt-3 grid gap-3">
          <p className="text-xs text-ink-mute">{t("explanation.hint")}</p>
          <TextArea
            label={t("explanation.text")}
            name="explanationText"
            required={false}
            defaultValue={task?.explanationText ?? ""}
          />
          <FileInput
            label={
              task?.explanationFilePath
                ? t("explanation.replaceFile")
                : t("explanation.file")
            }
            name="explanationFile"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            hint={`${t("explanation.fileHintPrefix")} ${maxUploadLabel()}`}
          />
          {task?.explanationFilePath && (
            <a
              className="text-sm text-navy underline"
              href={`/api/tasks/${task.id}/explanation/file`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {task.explanationFileName ?? t("explanation.openShort")}
            </a>
          )}
        </div>
      </details>
      <Button className="min-h-11 w-fit">
        {task ? t("action.save") : t("action.create")}
      </Button>
    </ActionForm>
  );
}
