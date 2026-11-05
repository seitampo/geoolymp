import Link from "next/link";
import type { LessonText } from "@/lib/lessonText";

export function LessonSteps({
  base,
  active,
  issued,
  text,
}: {
  base: string;
  active: string;
  issued: boolean;
  text: LessonText;
}) {
  const steps = [
    { key: "settings", label: text.settings, href: base + "?step=settings" },
    { key: "content", label: text.content, href: base + "?step=content" },
    { key: "preview", label: text.previewAssign, href: base + "/preview" },
  ];
  return (
    <nav
      aria-label={text.lessons}
      className="mb-7 flex flex-wrap gap-2 rounded-xl border border-line bg-white p-2"
    >
      {steps.map((step, i) => (
        <Link
          key={step.key}
          href={step.href}
          aria-current={active === step.key ? "step" : undefined}
          className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm ${active === step.key ? "bg-navy text-white" : "text-ink-soft hover:bg-paper"}`}
        >
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${active === step.key ? "bg-white/20" : "bg-paper"}`}
          >
            {i + 1}
          </span>
          <span>{step.label}</span>
        </Link>
      ))}
      {issued && (
        <Link
          href={base + "?step=results"}
          aria-current={active === "results" ? "page" : undefined}
          className={`flex min-h-11 items-center justify-center rounded-lg px-4 text-sm ${active === "results" ? "bg-navy text-white" : "text-ink-soft hover:bg-paper"}`}
        >
          {text.results}
        </Link>
      )}
    </nav>
  );
}
