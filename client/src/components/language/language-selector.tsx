import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Globe, Languages } from "lucide-react";

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
        >
          <Languages className="w-4 h-4" />
          {language === 'en' ? 'EN' : 'NL'}
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
      <Select value={language} onValueChange={(value) => setLanguage(value as 'en' | 'nl')}>
        <SelectTrigger className={`w-auto gap-2 ${size === 'sm' ? 'h-8' : size === 'lg' ? 'h-12' : 'h-10'}`}>
          <Globe className="w-4 h-4" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">
            <div className="flex items-center gap-2">
              <span className="text-lg">🇬🇧</span>
              {t('language.english')}
            </div>
          </SelectItem>
          <SelectItem value="nl">
            <div className="flex items-center gap-2">
              <span className="text-lg">🇳🇱</span>
              {t('language.dutch')}
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

// Compact version for login page
export const CompactLanguageSelector: React.FC = () => {
  const { language, setLanguage } = useTranslation();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLanguage(language === 'en' ? 'nl' : 'en')}
      className="gap-1 text-xs px-2 py-1 h-auto"
    >
      <span className="text-sm">{language === 'en' ? '🇬🇧' : '🇳🇱'}</span>
      <span className="font-medium">{language === 'en' ? 'EN' : 'NL'}</span>
    </Button>
  );
};