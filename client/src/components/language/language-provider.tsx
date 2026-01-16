import React, { useState, useEffect } from 'react';
import { 
  LanguageContext, 
  Language, 
  translate, 
  getStoredLanguage, 
  setStoredLanguage, 
  detectBrowserLanguage 
} from '@/lib/i18n';

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  // Initialize language on mount
  useEffect(() => {
    const stored = getStoredLanguage();
    if (stored) {
      setLanguageState(stored);
    } else {
      // Auto-detect from browser if no stored preference
      const detected = detectBrowserLanguage();
      setLanguageState(detected);
      setStoredLanguage(detected);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    setStoredLanguage(lang);
  };

  const t = (key: string, params?: Record<string, string>) => {
    return translate(key, language, params);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};