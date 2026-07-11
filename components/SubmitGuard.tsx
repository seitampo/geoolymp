"use client";

import { useEffect } from "react";

/**
 * Глобальная защита нативных форм (монтируется один раз в layout):
 * 1) форма с data-confirm="…" спрашивает подтверждение перед отправкой —
 *    для необратимых действий вроде удаления группы;
 * 2) после отправки любой формы её submit-кнопки блокируются — защита от
 *    двойных сабмитов на медленной сети.
 */
export function SubmitGuard() {
  useEffect(() => {
    const onSubmit = (event: Event) => {
      const form = event.target;

      if (!(form instanceof HTMLFormElement)) {
        return;
      }

      const confirmText = form.dataset.confirm;
      if (confirmText && !window.confirm(confirmText)) {
        event.preventDefault();
        return;
      }

      // Блокируем кнопки после того, как браузер уже собрал данные формы.
      setTimeout(() => {
        for (const button of form.querySelectorAll<HTMLButtonElement>(
          'button[type="submit"], button:not([type])',
        )) {
          button.disabled = true;
          button.classList.add("opacity-60", "cursor-wait");
        }
      }, 0);
    };

    document.addEventListener("submit", onSubmit);
    return () => document.removeEventListener("submit", onSubmit);
  }, []);

  return null;
}
