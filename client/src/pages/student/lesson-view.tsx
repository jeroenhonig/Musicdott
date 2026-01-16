import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X } from "lucide-react";
import LessonContentViewer from "@/components/lessons/lesson-content-viewer";
import AppLayout from "@/components/layouts/app-layout";

export default function StudentLessonView() {
  const { id } = useParams<{ id: string }>();
  const lessonId = parseInt(id || "0");

  const { data: lesson, isLoading } = useQuery({
    queryKey: ["/api/lessons", lessonId],
    enabled: !isNaN(lessonId),
  });

  if (isLoading) {
    return (
      <AppLayout title="Loading Lesson...">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  if (!lesson) {
    return (
      <AppLayout title="Lesson Not Found">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Lesson Not Found</h1>
            <Button onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={lesson.title}>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{lesson.title}</h1>
              {lesson.description && (
                <p className="text-gray-600 mt-1">{lesson.description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <LessonContentViewer contentBlocksJson={lesson.contentBlocks} />
        </div>
      </div>
    </AppLayout>
  );
}