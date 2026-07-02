import { SubmissionStatus } from "@prisma/client";
import type { ReactNode } from "react";

type BadgeTone = "gray" | "emerald" | "green" | "amber" | "red";

const toneClasses: Record<BadgeTone, string> = {
  gray: "bg-gray-100 text-gray-700",
  emerald: "bg-emerald-50 text-emerald-800",
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
};

export function Badge({ tone = "gray", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

/** Единый бейдж статуса решения — используется и у ученика, и у учителя. */
export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  return status === SubmissionStatus.REVIEWED ? (
    <Badge tone="green">Проверено</Badge>
  ) : (
    <Badge tone="amber">На проверке</Badge>
  );
}

/**
 * Статус задачи для ученика на карточке задачи. «Просрочено» показывается
 * только при пропущенном сроке сдачи без отправленного решения.
 */
export function TaskStatusBadge({
  status,
  overdue = false,
}: {
  status: SubmissionStatus | null;
  overdue?: boolean;
}) {
  if (status === SubmissionStatus.REVIEWED) {
    return <Badge tone="green">Решено</Badge>;
  }

  if (status === SubmissionStatus.PENDING) {
    return <Badge tone="amber">Проверяется</Badge>;
  }

  if (overdue) {
    return <Badge tone="red">Просрочено</Badge>;
  }

  return <Badge tone="gray">Не отправлено</Badge>;
}
