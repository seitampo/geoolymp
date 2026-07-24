/**
 * Публичный адрес сайта — единая точка правды для метатегов, robots и sitemap.
 * Боевой домен задаётся переменной NEXT_PUBLIC_SITE_URL в Vercel: сменить домен
 * можно без правок в коде. На превью-деплоях Vercel подставляет свой адрес сам,
 * локально — localhost.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    // Протокол добавляем сами: значение вида "example.kz" уронило бы весь сайт
    // на `new URL()` в generateMetadata — опечатка в env не должна ломать прод.
    const withProtocol = /^https?:\/\//i.test(configured) ? configured : `https://${configured}`;
    return withProtocol.replace(/\/+$/, "");
  }

  // Превью-деплой Vercel: VERCEL_URL приходит без протокола.
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel}`;
  }

  return "http://localhost:3000";
}

/**
 * Адрес для обращений по персональным данным (указан в политике конфиденциальности).
 * Держим в env: до подключения домена почтового ящика ещё нет, а прод-значение
 * не должно требовать релиза.
 */
export function privacyContactEmail(): string {
  return process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim() || "privacy@geoolymp.kz";
}

/** Индексируемые страницы: всё остальное — личный кабинет за авторизацией. */
export const publicRoutes = ["/", "/privacy", "/login", "/register"] as const;
