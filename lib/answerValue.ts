/** Canonical values let autosave compare drafts with server-normalized answers. */
export function canonicalAnswer(type: string, value: string) {
  if (type === "MULTIPLE_CHOICE")
    return [
      ...new Set(
        value
          .split(";")
          .map((part) => part.trim())
          .filter(Boolean),
      ),
    ]
      .sort((a, b) => a.localeCompare(b))
      .join("; ");
  return value.trim();
}
