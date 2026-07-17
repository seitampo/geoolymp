"use client";

import { useState } from "react";

/** Кнопка «скопировать в буфер» — для кода приглашения группы. */
export function CopyButton({ value, label = "Скопировать" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-0.5 text-xs font-medium text-ink-soft transition-colors hover:border-navy/40 hover:text-ink"
      onClick={async () => {
        let ok = false;
        try {
          await navigator.clipboard.writeText(value);
          ok = true;
        } catch {
          // Буфер недоступен (например, http без localhost) — пробуем запасной способ.
          const textarea = document.createElement("textarea");
          textarea.value = value;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          ok = document.execCommand("copy");
          textarea.remove();
        }
        if (ok) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }}
    >
      {copied ? "Скопировано ✓" : label}
    </button>
  );
}
