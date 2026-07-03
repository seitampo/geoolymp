"use client";

import { useEffect, useState } from "react";

/**
 * Клиентский обратный отсчёт для режима тренировки. Только отображение:
 * дедлайн контролирует сервер (роуты ответов и страница сверяются с expiresAt).
 * Когда время выходит, страница перезагружается — сервер завершает попытку
 * и показывает экран результата.
 */
export function TrainingTimer({ expiresAt }: { expiresAt: string }) {
  const [msLeft, setMsLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const remaining = new Date(expiresAt).getTime() - Date.now();

      if (remaining <= 0) {
        window.location.reload();
        return;
      }

      setMsLeft(remaining);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (msLeft === null) {
    return <span className="font-mono text-lg font-semibold tabular-nums text-gray-900">—:—</span>;
  }

  const totalSeconds = Math.floor(msLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const isLow = totalSeconds < 300;

  return (
    <span
      className={`font-mono text-lg font-semibold tabular-nums ${isLow ? "text-red-700" : "text-gray-900"}`}
    >
      {minutes}:{String(seconds).padStart(2, "0")}
    </span>
  );
}
