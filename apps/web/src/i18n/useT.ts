import { useAppStore } from "../store/appStore";
import { i18nStrings, type I18nKey, type Lang } from "../i18n/strings";

export function t(key: I18nKey): string {
  const lang: Lang = (useAppStore.getState().language as Lang) ?? "hi";
  const table = i18nStrings[lang] ?? i18nStrings.hi;
  return (table as Record<I18nKey, string>)[key] ?? i18nStrings.hi[key] ?? key;
}

export function tFor(lang: Lang, key: I18nKey): string {
  const table = i18nStrings[lang] ?? i18nStrings.hi;
  return (table as Record<I18nKey, string>)[key] ?? key;
}
