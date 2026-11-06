import i18next from 'i18next';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import 'dayjs/locale/fr';
import type { I18nProvider } from '@refinedev/core';
import { APP_LANG } from '../config/env';
import en from './en';
import fr from './fr';

i18next.init({
  resources: { en: { translation: en }, fr: { translation: fr } },
  lng: APP_LANG,
  fallbackLng: 'en',
  // Field names contain colons (e.g. vcard:given-name)
  nsSeparator: false,
  interpolation: { escapeValue: false }
});

dayjs.extend(localizedFormat);
dayjs.locale(APP_LANG);

export const i18nProvider: I18nProvider = {
  // Refine passes its default (English) messages either as 2nd or 3rd argument
  translate: (key: string, options?: any, defaultMessage?: string) =>
    typeof options === 'string'
      ? (i18next.t(key, { defaultValue: options }) as string)
      : (i18next.t(key, { ...options, defaultValue: defaultMessage }) as string),
  changeLocale: (lang: string) => i18next.changeLanguage(lang),
  getLocale: () => i18next.language
};
