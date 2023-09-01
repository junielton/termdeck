import { createI18n } from 'vue-i18n';
// Precompiled locale JSON (handled by @intlify/unplugin-vue-i18n)
import en from './locales/en.json';
import pt from './locales/pt.json';

export const availableLocales = [ 'en', 'pt' ];

export function createI18nInstance() {
  const browser = (navigator.language || 'en').slice(0,2);
  const locale = availableLocales.includes(browser) ? browser : 'en';
  return createI18n({ legacy: false, locale, fallbackLocale: 'en', messages: { en, pt }, runtimeOnly: true });
}

export type AppI18n = ReturnType<typeof createI18nInstance>;
