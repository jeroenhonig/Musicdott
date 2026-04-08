import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar, Clock, User, MapPin, X } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AppLayout from "@/components/layouts/app-layout";

export default function MySchedulePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  // First get the student record for this user
  const { data: students = [] } = useQuery<any[]>({
    queryKey: ["/api/students"],
    enabled: !!user?.id && user?.role === 'student',
  });
  
  // Find the student record that belongs to this user
  const currentStudent = students.find(s => s.userId === user?.id);
  const studentId = currentStudent?.id;
  
  const { data: sessions = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/students", studentId, "sessions"],
    enabled: !!studentId,
  });

  const { data: recurringSchedules = [], isLoading: schedulesLoading } = useQuery<any[]>({
    queryKey: ["/api/students", studentId, "recurring-schedules"],
    enabled: !!studentId,
  });

  const cancelLessonMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      return await apiRequest("DELETE", `/api/sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students", studentId, "sessions"] });
      toast({
        title: t('studentPortal.mySchedule.lessonCancelledTitle'),
        description: t('studentPortal.mySchedule.lessonCancelledDesc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('studentPortal.mySchedule.cancelFailedTitle'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading || schedulesLoading) {
    return (
      <AppLayout title={t('schedule.mySchedule')}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const upcomingSessions = sessions?.filter((session: any) => 
    new Date(session.startTime) > new Date()
  ).slice(0, 5) || [];

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <AppLayout title={t('studentPortal.mySchedule.title')}>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('studentPortal.mySchedule.title')}</h1>
          <p className="text-gray-600 mt-2">{t('studentPortal.mySchedule.subtitle')}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span>{t('studentPortal.mySchedule.upcomingLessons')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingSessions.length > 0 ? (
                <div className="space-y-4">
                  {upcomingSessions.map((session: any) => (
                    <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{session.title}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{format(new Date(session.startTime), "MMM d, h:mm a")}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          {session.status || 'scheduled'}
                        </Badge>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('studentPortal.mySchedule.cancelConfirmTitle')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel "{session.title}" scheduled for {format(new Date(session.startTime), "MMM d, h:mm a")}? {t('studentPortal.mySchedule.cancelConfirmDesc')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('studentPortal.mySchedule.keepLesson')}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => cancelLessonMutation.mutate(session.id)}
                                disabled={cancelLessonMutation.isPending}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                {cancelLessonMutation.isPending ? t('studentPortal.mySchedule.cancelling') : t('studentPortal.mySchedule.cancelLesson')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">{t('studentPortal.mySchedule.noUpcomingLessons')}</p>
              )}
            </CardContent>
          </Card>

          {/* Weekly Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-green-600" />
                <span>{t('studentPortal.mySchedule.regularSchedule')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recurringSchedules && recurringSchedules.length > 0 ? (
                <div className="space-y-3">
                  {recurringSchedules.map((schedule: any) => (
                    <div key={schedule.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <h4 className="font-medium">
                          {[
                            t('schedule.days.sunday'),
                            t('schedule.days.monday'),
                            t('schedule.days.tuesday'),
                            t('schedule.days.wednesday'),
                            t('schedule.days.thursday'),
                            t('schedule.days.friday'),
                            t('schedule.days.saturday')
                          ][schedule.dayOfWeek]}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{schedule.startTime} - {schedule.endTime}</span>
                          </span>
                          {schedule.location && (
                            <span className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span>{schedule.location}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">{t('studentPortal.mySchedule.noRegularSchedule')}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Week View */}
        <Card>
          <CardHeader>
            <CardTitle>{t('studentPortal.mySchedule.thisWeek')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, index) => (
                <div key={index} className="text-center">
                  <div className="font-medium text-sm text-gray-600 mb-2">
                    {format(day, "EEE")}
                  </div>
                  <div className="font-bold text-lg mb-2">
                    {format(day, "d")}
                  </div>
                  <div className="space-y-1">
                    {sessions?.filter((session: any) => 
                      format(new Date(session.startTime), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
                    ).map((session: any) => (
                      <div key={session.id} className="bg-blue-100 text-blue-800 text-xs p-1 rounded">
                        {format(new Date(session.startTime), "HH:mm")}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}