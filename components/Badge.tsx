import { SubmissionStatus } from "@prisma/client";
import type { ReactNode } from "react";
import { getT } from "@/lib/i18n";

type BadgeTone = "gray" | "emerald" | "green" | "amber" | "red";

// «emerald» исторически — фирменный акцент; в палитре «Атлас» это золото наград.
const toneClasses: Record<BadgeTone, string> = {
  gray: "bg-ink/5 text-ink-soft",
  emerald: "bg-gold-soft text-gold-text",
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
};

export function Badge({ tone = "gray", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

/** Единый бейдж статуса решения — используется и у ученика, и у учителя. */
export async function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  const t = await getT();
  return status === SubmissionStatus.REVIEWED ? (
    <Badge tone="green">{t("status.REVIEWED")}</Badge>
  ) : (
    <Badge tone="amber">{t("status.PENDING")}</Badge>
  );
}

/**
 * Статус задачи для ученика на карточке задачи. «Просрочено» показывается
 * только при пропущенном сроке сдачи без отправленного решения.
 */
export async function TaskStatusBadge({
  status,
  overdue = false,
}: {
  status: SubmissionStatus | null;
  overdue?: boolean;
}) {
  const t = await getT();

  if (status === SubmissionStatus.REVIEWED) {
    return <Badge tone="green">{t("taskStatus.solved")}</Badge>;
  }

  if (status === SubmissionStatus.PENDING) {
    return <Badge tone="amber">{t("taskStatus.pending")}</Badge>;
  }

  if (overdue) {
    return <Badge tone="red">{t("taskStatus.overdue")}</Badge>;
  }

  return <Badge tone="gray">{t("taskStatus.notSubmitted")}</Badge>;
}
