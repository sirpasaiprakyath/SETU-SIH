import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { translations } from "./locales/translations";

export type Language = "en" | "hi";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
  tr: (enText: string, hiText: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
  tr: (enText: string) => enText,
});

export const useLanguage = () => useContext(LanguageContext);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("setu_lang");
    return saved === "hi" ? "hi" : "en";
  });

  useEffect(() => {
    localStorage.setItem("setu_lang", language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === "en" ? "hi" : "en"));
  }, []);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const item = translations[key];
      if (item && item[language]) {
        return item[language];
      }
      return fallback || key;
    },
    [language]
  );

  const tr = useCallback(
    (enText: string, hiText: string): string => {
      return language === "hi" ? hiText : enText;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t, tr }}>
      {children}
    </LanguageContext.Provider>
  );
}
