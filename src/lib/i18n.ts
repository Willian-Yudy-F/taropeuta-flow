import "server-only";

export const locales = ["en", "pt"] as const;
export type Locale = (typeof locales)[number];

const dictionaries = {
  en: () => import("@/dictionaries/en.json").then((m) => m.default),
  pt: () => import("@/dictionaries/pt.json").then((m) => m.default),
};

export const isLocale = (v: string): v is Locale => locales.includes(v as Locale);
export const getDictionary = (locale: Locale) => dictionaries[locale]();
