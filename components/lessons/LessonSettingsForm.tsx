import type { TaskSet } from "@prisma/client";
import { getLessonText } from "@/lib/lessonText";
import { getT } from "@/lib/i18n";
import { setModeLabels } from "@/lib/mapLabels";
import { SetModeFields } from "../SetModeFields";
import { ActionForm } from "../ActionForm";
import { TextArea, TextInput } from "../FormFields";

export async function LessonSettingsForm({
  groupId,
  lesson,
}: {
  groupId: number;
  lesson?: TaskSet;
}) {
  const text = await getLessonText();
  const t = await getT();
  return (
    <div className="rounded-xl border border-line bg-white p-5 sm:p-7">
      <h2 className="text-base font-semibold">{text.settings}</h2>
      <ActionForm
        action={
          lesson
            ? `/api/sets/${lesson.id}/update`
            : `/api/groups/${groupId}/sets`
        }
        errorLabel={text.error}
        savingLabel={text.saving}
        successLabel={text.saved}
      >
        <TextInput
          label={text.name}
          name="title"
          placeholder={text.nameExample}
          defaultValue={lesson?.title}
        />
        <TextArea
          label={`${text.description} (${text.optional.toLowerCase()})`}
          name="description"
          required={false}
          defaultValue={lesson?.description}
        />
        <SetModeFields
          labels={setModeLabels(t)}
          defaultMinutes={lesson?.trainingMinutes}
        />
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <button
            className="min-h-12 rounded-lg bg-navy px-5 py-3 text-sm font-semibold text-white"
            type="submit"
          >
            {lesson ? text.saveContinue : text.continue} →
          </button>
          <p className="max-w-sm text-xs leading-relaxed text-ink-mute">
            {lesson?.isPublished ? text.issuedHint : text.draftHint}
          </p>
        </div>
      </ActionForm>
    </div>
  );
}
