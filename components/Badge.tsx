import { SubmissionStatus } from "@prisma/client";
import type { ReactNode } from "react";
import { getT, type TranslationKey } from "@/lib/i18n";
import { studentTaskStatus, type StudentTaskStatus } from "@/lib/taskStatus";

type BadgeTone = "gray" | "emerald" | "green" | "amber" | "red";

// «emerald» исторически — фирменный акцент; в палитре «Атлас» это золото наград.
const toneClasses: Record<BadgeTone, string> = {
  gray: "bg-ink/5 text-ink-soft",
  emerald: "bg-gold-soft text-gold-text",
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
};

export function Badge({
  tone = "gray",
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

/** Единый бейдж статуса решения — используется и у ученика, и у учителя. */
export async function SubmissionStatusBadge({
  status,
}: {
  status: SubmissionStatus;
}) {
  const t = await getT();
  return status === SubmissionStatus.REVIEWED ? (
    <Badge tone="green">{t("status.REVIEWED")}</Badge>
  ) : (
    <Badge tone="amber">{t("status.PENDING")}</Badge>
  );
}

/**
 * Статус задачи для ученика на карточке задачи. Если известен балл проверенного
 * решения, статус честный: полный балл — «Решено», часть баллов — «Частично
 * решено», ноль — «Неверно».
 */
export async function TaskStatusBadge({
  status,
  score = null,
  maxScore = null,
}: {
  status: SubmissionStatus | null;
  score?: number | null;
  maxScore?: number | null;
}) {
  const t = await getT();
  const state = studentTaskStatus(
    status ? { status, review: score === null ? null : { score } } : null,
    maxScore ?? 0,
  );
  const labels: Record<StudentTaskStatus, TranslationKey> = {
    solved: "taskStatus.solved",
    partial: "taskStatus.partial",
    wrong: "taskStatus.wrong",
    pending: "taskStatus.pending",
    "not-submitted": "taskStatus.notSubmitted",
  };
  const tones: Record<StudentTaskStatus, BadgeTone> = {
    solved: "green",
    partial: "emerald",
    wrong: "red",
    pending: "amber",
    "not-submitted": "gray",
  };
  return <Badge tone={tones[state]}>{t(labels[state])}</Badge>;
}
