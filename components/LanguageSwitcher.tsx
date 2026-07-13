"use client";

/**
 * Переключатель языка интерфейса. Ставит cookie `locale` и перезагружает страницу —
 * серверные компоненты читают язык из cookie при следующем рендере. Контент задач,
 * который вводят пользователи, не затрагивается.
 */
export function LanguageSwitcher({ locale, aria }: { locale: "ru" | "kk"; aria: string }) {
  function choose(next: "ru" | "kk") {
    if (next === locale) return;
    document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
    location.reload();
  }

  const base = "px-2 py-0.5 text-xs font-semibold rounded transition-colors";
  const active = "bg-rust text-white";
  const idle = "text-ink-mute hover:text-ink";

  return (
    <div
      role="group"
      aria-label={aria}
      className="inline-flex items-center gap-0.5 rounded-md border border-line bg-white p-0.5"
    >
      <button type="button" onClick={() => choose("ru")} aria-pressed={locale === "ru"} className={`${base} ${locale === "ru" ? active : idle}`}>
        RU
      </button>
      <button type="button" onClick={() => choose("kk")} aria-pressed={locale === "kk"} className={`${base} ${locale === "kk" ? active : idle}`}>
        KZ
      </button>
    </div>
  );
}
