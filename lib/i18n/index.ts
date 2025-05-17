import { tr } from './tr';

export const i18n = {
  tr,
};

export type Language = keyof typeof i18n;
export type TranslationKey = keyof typeof tr;

export function t(key: string, lang: Language = 'tr'): string {
  const keys = key.split('.');
  let value: any = i18n[lang];
  
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      return key;
    }
  }
  
  return typeof value === 'string' ? value : key;
} 