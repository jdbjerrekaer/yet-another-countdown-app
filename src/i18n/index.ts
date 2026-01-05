import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enTranslations from './locales/en/translation.json';
import esTranslations from './locales/es/translation.json';
import itTranslations from './locales/it/translation.json';
import ptTranslations from './locales/pt/translation.json';
import deTranslations from './locales/de/translation.json';
import ruTranslations from './locales/ru/translation.json';
import frTranslations from './locales/fr/translation.json';

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
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'it', 'pt', 'de', 'ru', 'fr'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;
