"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import {
  SupportedLanguage,
  TranslationDictionary,
  LANGUAGES,
  SPEECH_LANGUAGES,
  CATEGORY_NAMES,
  STATUS_NAMES,
  getTranslations,
  LanguageInfo,
} from "./translations";

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: TranslationDictionary;
  speechLang: string;
  languages: LanguageInfo[];
  getCategoryName: (category: string) => string;
  getStatusName: (status: string) => string;
  isHydrated: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

const PREFERRED_LANGUAGE_KEY = "preferredLanguage";
const LEGACY_LANGUAGE_KEY = "peoples-priorities-language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize from localStorage safely after hydration
  useEffect(() => {
    try {
      const stored =
        localStorage.getItem(PREFERRED_LANGUAGE_KEY) ||
        localStorage.getItem(LEGACY_LANGUAGE_KEY);

      if (stored) {
        const valid = LANGUAGES.find((item) => item.code === stored);
        if (valid) {
          setLanguageState(valid.code);
          document.documentElement.lang = valid.code;
        }
      }
    } catch {
      // ignore storage access errors
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const setLanguage = (newLang: SupportedLanguage) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(PREFERRED_LANGUAGE_KEY, newLang);
      localStorage.setItem(LEGACY_LANGUAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    } catch {
      // ignore storage access errors
    }
  };

  const t = useMemo(() => getTranslations(language), [language]);
  const speechLang = useMemo(
    () => SPEECH_LANGUAGES[language] || "en-IN",
    [language]
  );

  const getCategoryName = (category: string): string => {
    return CATEGORY_NAMES[category]?.[language] || CATEGORY_NAMES[category]?.en || category;
  };

  const getStatusName = (status: string): string => {
    return STATUS_NAMES[status]?.[language] || STATUS_NAMES[status]?.en || status;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        speechLang,
        languages: LANGUAGES,
        getCategoryName,
        getStatusName,
        isHydrated,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
