"use client";

import { useState } from "react";
import { inputClasses } from "@/components/FormFields";

/** Поле пароля с переключателем видимости. Подписи переключателя переводятся через пропсы
 *  (компонент клиентский, поэтому строки приходят уже переведёнными со страницы). */
export function PasswordInput({
  label = "Пароль",
  name = "password",
  placeholder,
  showLabel = "Показать",
  hideLabel = "Скрыть",
  showAria = "Показать пароль",
  hideAria = "Скрыть пароль",
}: {
  label?: string;
  name?: string;
  placeholder?: string;
  showLabel?: string;
  hideLabel?: string;
  showAria?: string;
  hideAria?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</span>
      <div className="relative">
        <input
          className={`${inputClasses} pr-20`}
          name={name}
          type={visible ? "text" : "password"}
          required
          placeholder={placeholder}
          autoComplete="current-password"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-ink-mute transition-colors hover:text-ink"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? hideAria : showAria}
        >
          {visible ? hideLabel : showLabel}
        </button>
      </div>
    </label>
  );
}
