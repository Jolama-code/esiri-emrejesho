import sw, { type I18nKey } from './sw';
import en from './en';
import { useApp, type Language } from '../store/appStore';
import type { Text } from '../store/data';

export type { I18nKey };

const dicts = { sw, en } as const;

export type Params = Record<string, string | number>;

export function tr(lang: Language, key: I18nKey, params?: Params): string {
  let s: string = dicts[lang][key] ?? sw[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

/** Translate using the current store language (outside React). */
export function t(key: I18nKey, params?: Params): string {
  return tr(useApp.getState().language, key, params);
}

export type TFunc = (key: I18nKey, params?: Params) => string;

/** React hook: re-renders when the language changes. */
export function useT(): TFunc {
  const lang = useApp((s) => s.language);
  return (key, params) => tr(lang, key, params);
}

export function useLang(): Language {
  return useApp((s) => s.language);
}

/** Pick the current-language variant of a bilingual data text. */
export function pick(text: Text, lang: Language): string {
  return text[lang] || text.sw;
}
