import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Music, BookOpen } from "lucide-react";
import LessonContentViewer from "@/components/lessons/lesson-content-viewer";
import AppLayout from "@/components/layouts/app-layout";
import StudentContentHeader from "@/components/student/student-content-header";
import StudentViewSkeleton from "@/components/student/student-view-skeleton";
import type { MetadataBadge } from "@/components/student/student-content-header";
import { useTranslation } from "@/lib/i18n";

export default function StudentLessonView() {
  const { id } = useParams<{ id: string }>();
  const lessonId = parseInt(id || "0");
  const { t } = useTranslation();

  const { data: lesson, isLoading } = useQuery({
    queryKey: ["/api/lessons", lessonId],
    enabled: !isNaN(lessonId),
  });

  if (isLoading) {
    return <StudentViewSkeleton />;
  }

  if (!lesson) {
    return (
      <AppLayout title={t('studentPortal.lessonView.notFoundTitle')}>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">{t('studentPortal.lessonView.notFoundTitle')}</h1>
            <Button onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('studentPortal.lessonView.goBack')}
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const badges: MetadataBadge[] = [
    ...(lesson.instrument ? [{ icon: Music, label: lesson.instrument, variant: 'outline' as const }] : []),
    ...(lesson.level ? [{ icon: BookOpen, label: lesson.level, variant: 'secondary' as const }] : []),
    ...(lesson.category ? [{ label: lesson.category, variant: 'outline' as const }] : []),
  ];

  return (
    <AppLayout title={lesson.title}>
      <div className="space-y-6">
        <StudentContentHeader
          title={lesson.title}
          subtitle={lesson.description}
          badges={badges}
        />
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <LessonContentViewer contentBlocksJson={lesson.contentBlocks} />
        </div>
      </div>
    </AppLayout>
  );
}
