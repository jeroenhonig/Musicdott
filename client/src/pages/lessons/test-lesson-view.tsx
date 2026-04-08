import React from 'react';
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layouts/app-layout";
import { useTranslation } from "@/lib/i18n";

// Simple test component to isolate React error #310
export default function TestLessonView() {
  const { t } = useTranslation();

  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{t('testLesson.title')}</h1>
        <p>{t('testLesson.description')}</p>
        <Button>{t('testLesson.button')}</Button>
      </div>
    </AppLayout>
  );
}