import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

// Import translations
import enTranslations from './locales/en/translation.json';
import esTranslations from './locales/es/translation.json';
import itTranslations from './locales/it/translation.json';
import ptTranslations from './locales/pt/translation.json';
import deTranslations from './locales/de/translation.json';
import ruTranslations from './locales/ru/translation.json';
import frTranslations from './locales/fr/translation.json';
import daTranslations from './locales/da/translation.json';
import svTranslations from './locales/sv/translation.json';
import noTranslations from './locales/no/translation.json';
import fiTranslations from './locales/fi/translation.json';

// Supported languages - keep in sync with iOS Settings.bundle
export const SUPPORTED_LANGUAGES = ['en', 'es', 'it', 'pt', 'de', 'ru', 'fr', 'da', 'sv', 'no', 'fi'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Initialize i18n synchronously first
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      es: { translation: esTranslations },
      it: { translation: itTranslations },
      pt: { translation: ptTranslations },
      de: { translation: deTranslations },
      ru: { translation: ruTranslations },
      fr: { translation: frTranslations },
      da: { translation: daTranslations },
      sv: { translation: svTranslations },
      no: { translation: noTranslations },
      fi: { translation: fiTranslations },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

// Check Capacitor Preferences and update language if needed
async function checkPreferencesLanguage() {
  if (Capacitor.isNativePlatform()) {
    try {
      const { value } = await Preferences.get({ key: 'app_language' });
      if (value && SUPPORTED_LANGUAGES.includes(value as SupportedLanguage)) {
        if (i18n.language !== value) {
          await i18n.changeLanguage(value);
          localStorage.setItem('i18nextLng', value);
        }
      } else if (!value && i18n.language) {
        await Preferences.set({ key: 'app_language', value: i18n.language });
      }
    } catch (error) {
      console.warn('Failed to read language preference:', error);
    }
  }
}

// Check preferences on initialization
checkPreferencesLanguage();

// Sync language changes to Capacitor Preferences
i18n.on('languageChanged', async (lng) => {
  if (Capacitor.isNativePlatform()) {
    try {
      await Preferences.set({ key: 'app_language', value: lng });
    } catch (error) {
      console.warn('Failed to save language preference:', error);
    }
  }
  localStorage.setItem('i18nextLng', lng);
});

export default i18n;
export { checkPreferencesLanguage };