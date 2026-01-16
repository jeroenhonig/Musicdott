import { LessonPerformanceDashboard } from '@/components/performance/lesson-performance-dashboard';
import AppLayout from '@/components/layouts/app-layout';

export default function PerformancePage() {
  return (
    <AppLayout title="Performance Analytics">
      <LessonPerformanceDashboard />
    </AppLayout>
  );
}