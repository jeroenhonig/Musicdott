import React from 'react';
import { useTranslation, SUPPORTED_LANGUAGES, type Language } from '@/lib/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

interface LanguageSelectorProps {
  variant?: 'dropdown' | 'toggle';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  variant = 'dropdown', 
  size = 'md',
  showLabel = false 
}) => {
  const { language, setLanguage, t } = useTranslation();

  if (variant === 'toggle') {
    return (
      <div className="flex items-center gap-2">
        {showLabel && (
          <span className="text-sm text-muted-foreground">
            {t('settings.language')}:
          </span>
        )}
        <Button
          variant="ghost"
          size={size}
          onClick={() => setLanguage(language === 'en' ? 'nl' : 'en')}
          className="gap-2"
          aria-label={language === 'en' ? 'Switch to Dutch (NL)' : 'Switch to English (EN)'}
        >
          <span className="text-sm">{language === 'en' ? '🇬🇧' : '🇳🇱'}</span>
          <span className="font-medium text-xs">{language === 'en' ? 'EN' : 'NL'}</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <span className="text-sm text-muted-foreground">
          {t('settings.language')}:
        </span>
      )}
      <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
        <SelectTrigger className={`w-auto gap-2 ${size === 'sm' ? 'h-8' : size === 'lg' ? 'h-12' : 'h-10'}`}>
          <Globe className="w-4 h-4" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{lang.flag}</span>
                {lang.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

// Compact flag toggle used in navigation header areas — cycles through SUPPORTED_LANGUAGES
export const CompactLanguageSelector: React.FC = () => {
  const { language, setLanguage } = useTranslation();

  const currentIndex = SUPPORTED_LANGUAGES.findIndex((l) => l.code === language);
  const current = SUPPORTED_LANGUAGES[currentIndex] ?? SUPPORTED_LANGUAGES[0];
  const next = SUPPORTED_LANGUAGES[(currentIndex + 1) % SUPPORTED_LANGUAGES.length];

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLanguage(next.code)}
      className="gap-1 text-xs px-2 py-1 h-auto"
      aria-label={`Switch to ${next.label}`}
    >
      <span className="text-sm">{current.flag}</span>
      <span className="font-medium">{current.code.toUpperCase()}</span>
    </Button>
  );
};