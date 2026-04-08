/**
 * GrooveScribe Converter Page
 * Comprehensive GrooveScribe link/query to iframe converter
 */

import React from "react";
import { GrooveConverter } from "@/components/groove/groove-auto-embed";
import { useTranslation } from "@/lib/i18n";

export default function GrooveConverterPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('grooveConverter.title')}
          </h1>
          <p className="text-gray-600">
            {t('grooveConverter.subtitle')}
          </p>
        </div>

        <GrooveConverter />

        <div className="mt-12 bg-white rounded-lg p-6 border">
          <h2 className="text-xl font-semibold mb-4">{t('grooveConverter.howItWorks')}</h2>
          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <h3 className="font-medium text-gray-900">✅ {t('grooveConverter.autoPaste.title')}</h3>
              <p>{t('grooveConverter.autoPaste.description')}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">🔒 {t('grooveConverter.safeUrl.title')}</h3>
              <p>{t('grooveConverter.safeUrl.description')}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">🎯 {t('grooveConverter.multiFormat.title')}</h3>
              <p>{t('grooveConverter.multiFormat.description')}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">📱 {t('grooveConverter.responsive.title')}</h3>
              <p>{t('grooveConverter.responsive.description')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}