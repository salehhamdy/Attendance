import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { translations } from './translations.js';

const I18nContext = createContext({
  lang: 'en',
  isRTL: false,
  setLang: () => {},
  toggleLang: () => {},
  t: (key) => key,
});

export const useI18n = () => useContext(I18nContext);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('attendance_lang') || 'en';
      }
    } catch {
      // Fallback
    }
    return 'en';
  });

  const isRTL = lang === 'ar';

  useEffect(() => {
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('attendance_lang', lang);
      }
    } catch {
      // Safe fallback
    }
  }, [lang, isRTL]);

  const setLang = useCallback((newLang) => {
    setLangState(newLang === 'ar' ? 'ar' : 'en');
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === 'en' ? 'ar' : 'en'));
  }, []);

  const t = useCallback(
    (key, fallback = '') => {
      const dict = translations[lang] || translations.en;
      return dict[key] || fallback || translations.en[key] || key;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, isRTL, setLang, toggleLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export default I18nContext;
