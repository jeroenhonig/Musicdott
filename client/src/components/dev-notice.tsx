import { useTranslation } from "@/lib/i18n";

export function DevelopmentNotice() {
  const { t } = useTranslation();

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
      <div className="max-w-7xl mx-auto">
        <p className="text-sm text-yellow-800 text-center">
          <span className="font-medium">{t('notice.development')}</span>. 
          <a href="https://musicdott.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-900">
            {t('notice.visitMain')}
          </a>
        </p>
      </div>
    </div>
  );
}