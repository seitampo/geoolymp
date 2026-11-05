"use client";
import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { TextInput, TextArea, FileInput } from "@/components/FormFields";
import { Button } from "@/components/Button";
import type { LessonText } from "@/lib/lessonText";
export function MaterialForm({
  groupId,
  setId,
  text,
}: {
  groupId: number;
  setId?: number;
  text: LessonText;
}) {
  const [type, setType] = useState("TEXT");
  return (
    <div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          ["TEXT", text.materialText],
          ["LINK", text.materialLink],
          ["FILE", text.materialFile],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={type === value}
            className={`min-h-11 rounded-lg border px-4 text-sm ${type === value ? "border-navy bg-navy-soft font-semibold text-navy" : "border-line"}`}
            onClick={() => setType(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <ActionForm
        key={type}
        action={`/api/groups/${groupId}/materials`}
        savingLabel={text.saving}
        successLabel={text.saved}
        errorLabel={text.error}
        resetOnSuccess
      >
        <input type="hidden" name="type" value={type} />
        {setId && <input type="hidden" name="setId" value={setId} />}
        <TextInput label={text.materialTitle} name="title" />
        {type === "LINK" && (
          <TextInput label={text.materialUrl} name="url" type="url" />
        )}
        {type === "FILE" && (
          <FileInput
            label={text.materialFile}
            name="file"
            accept=".pdf,.docx,.pptx,.zip,.jpg,.jpeg,.png,.webp"
            hint={text.fileHint}
          />
        )}
        <TextArea
          label={`${text.materialBody}${type !== "TEXT" ? ` · ${text.optional}` : ""}`}
          name="description"
          required={type === "TEXT"}
        />
        <Button className="w-fit">{text.addMaterial}</Button>
      </ActionForm>
    </div>
  );
}
