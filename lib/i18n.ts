import { cookies } from "next/headers";
import { kk } from "./locales/kk";
import { ru } from "./locales/ru";

export const locales = ["ru", "kk"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ru";
export const LOCALE_COOKIE = "locale";

const dictionaries = { ru, kk };

export type TranslationKey = keyof typeof ru;
export type TFunction = (key: TranslationKey) => string;

export function isLocale(value: string | undefined): value is Locale {
  return value === "ru" || value === "kk";
}

/** Текущий язык из cookie (по умолчанию русский). */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

/** Функция перевода для серверных компонентов: const t = await getT(); t("common.login"). */
export async function getT(): Promise<TFunction> {
  const locale = await getLocale();
  const dict = dictionaries[locale];
  return (key: TranslationKey) => dict[key] ?? ru[key];
}
