import path from "path";
import { hasStorageRoom, isUploadTooLarge, saveUploadedFile } from "./uploads";

export async function prepareTaskExplanation(form: FormData) {
  const text = String(form.get("explanationText") ?? "").trim();
  const file = form.get("explanationFile");
  if (!(file instanceof File) || !file.size) return { text, file: null };
  if (isUploadTooLarge(file.size)) return { error: "err.fileTooBig" as const };
  if (
    ![".pdf", ".jpg", ".jpeg", ".png", ".webp"].includes(
      path.extname(file.name).toLowerCase(),
    )
  )
    return { error: "err.explanationFile" as const };
  if (!(await hasStorageRoom(file.size)))
    return { error: "ui.genericError" as const };
  return { text, file: await saveUploadedFile(file, "tasks") };
}
