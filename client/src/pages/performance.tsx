import { LessonPerformanceDashboard } from '@/components/performance/lesson-performance-dashboard';
import AppLayout from '@/components/layouts/app-layout';
import { useTranslation } from "@/lib/i18n";

export default function PerformancePage() {
  const { t } = useTranslation();
  return (
    <AppLayout title={t('performance.title')}>
      <LessonPerformanceDashboard />
    </AppLayout>
  );
}