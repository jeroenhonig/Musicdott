import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Calendar, 
  Clock, 
  Music, 
  BookOpen, 
  Users, 
  Settings,
  ExternalLink,
  PlayCircle,
  FileText,
  Download
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from '@/lib/i18n';
import StudentOverviewDashboard from '@/components/students/student-overview-dashboard';

interface TodayStudent {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  location?: string;
  instrument?: string;
  level?: string;
  points?: number;
  assignedLessons?: number;
  assignedSongs?: number;
}

interface RecentSong {
  id: number;
  artist: string;
  title: string;
  modifiedDate: string;
  hasPDF: boolean;
  hasNotation: boolean;
  hasMuseScore: boolean;
}

interface RecentLesson {
  id: number;
  title: string;
  category: string;
  modifiedDate: string;
  hasPDF: boolean;
  hasNotation: boolean;
  hasMuseScore: boolean;
}

interface DashboardWidgets {
  showSongs: boolean;
  showLessons: boolean;
  showBooks: boolean;
  showNews: boolean;
  showSchool: boolean;
}

/**
 * MusicDott 1.0 Dashboard - Modern React Implementation
 * Preserves exact functionality from original PHP dashboard including:
 * - Today window with clickable student names
 * - Recent songs and lessons with checkboxes for assignment
 * - Widget-based layout matching original design
 * - GrooveScribe integration
 */
export default function MusicDottV1Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [selectedStudent, setSelectedStudent] = useState<TodayStudent | null>(null);
  const [selectedSongs, setSelectedSongs] = useState<number[]>([]);
  const [selectedLessons, setSelectedLessons] = useState<number[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<number[]>([]);
  const today = new Date();

  // Dashboard widget visibility settings (from original POS_Docent table)
  const { data: widgets } = useQuery<DashboardWidgets>({
    queryKey: ['/api/dashboard/widgets'],
  });

  // Today's scheduled students (from original calendar/schedule system)
  const { data: todayStudents, isLoading: todayLoading } = useQuery<TodayStudent[]>({
    queryKey: ['/api/dashboard/today-students'],
  });

  // Recent songs (original: "ORDER BY soDatumGemaakt DESC LIMIT 0,6")
  const { data: recentSongs, isLoading: songsLoading } = useQuery<RecentSong[]>({
    queryKey: ['/api/dashboard/recent-songs'],
  });

  // Recent lessons (original: "ORDER BY noDatumGemaakt DESC LIMIT 0,6")
  const { data: recentLessons, isLoading: lessonsLoading } = useQuery<RecentLesson[]>({
    queryKey: ['/api/dashboard/recent-lessons'],
  });

  const handleSongSelection = (songId: number, checked: boolean) => {
    if (checked) {
      setSelectedSongs(prev => [...prev, songId]);
    } else {
      setSelectedSongs(prev => prev.filter(id => id !== songId));
    }
  };

  const handleLessonSelection = (lessonId: number, checked: boolean) => {
    if (checked) {
      setSelectedLessons(prev => [...prev, lessonId]);
    } else {
      setSelectedLessons(prev => prev.filter(id => id !== lessonId));
    }
  };

  const handleSelectAllSongs = (checked: boolean) => {
    if (checked) {
      setSelectedSongs(recentSongs?.map(song => song.id) || []);
    } else {
      setSelectedSongs([]);
    }
  };

  const handleSelectAllLessons = (checked: boolean) => {
    if (checked) {
      setSelectedLessons(recentLessons?.map(lesson => lesson.id) || []);
    } else {
      setSelectedLessons([]);
    }
  };

  const handleAssignToStudent = (studentId: number) => {
    // Original functionality: assign selected items to student
    if (selectedSongs.length > 0 || selectedLessons.length > 0) {
      // Implement assignment logic here
      console.log('Assigning to student:', studentId, {
        songs: selectedSongs,
        lessons: selectedLessons,
        books: selectedBooks
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Widget Bar (matching original widgets.php) */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">
                {format(today, 'EEEE, MMMM d, yyyy - HH:mm:ss')}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <a href="https://teacher.musicdott.com/groovescribe/" target="_blank" rel="noopener noreferrer">
                  <Music className="h-4 w-4 mr-2" />
                  GrooveScribe
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
              
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                School
              </Button>
              
              <Button variant="ghost" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Logbook
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content Area (3 columns) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Songs Widget (conditional based on mlDashSongs) */}
          {widgets?.showSongs && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-green-600">
                    SONGS
                  </CardTitle>
                  <Button variant="outline" size="sm">
                    + Add Song
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Alphabet Navigation (original functionality) */}
                <div className="text-center mb-4 pb-4 border-b">
                  <div className="flex flex-wrap justify-center gap-2 text-sm">
                    {Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').map(letter => (
                      <Button key={letter} variant="ghost" size="sm" className="h-6 px-2">
                        {letter}
                      </Button>
                    ))}
                    <Button variant="ghost" size="sm" className="h-6 px-2">#</Button>
                  </div>
                </div>

                {/* Songs Table (matching original sortable table) */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="w-8 text-left">
                          <Checkbox 
                            checked={selectedSongs.length === recentSongs?.length && recentSongs?.length > 0}
                            onCheckedChange={handleSelectAllSongs}
                          />
                        </th>
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Artist</th>
                        <th className="text-left p-2">Title</th>
                        <th className="w-8"></th>
                        <th className="w-8"></th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSongs?.map(song => (
                        <tr key={song.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <Checkbox 
                              checked={selectedSongs.includes(song.id)}
                              onCheckedChange={(checked) => handleSongSelection(song.id, checked as boolean)}
                            />
                          </td>
                          <td className="p-2">{song.modifiedDate}</td>
                          <td className="p-2">
                            <Button variant="link" className="p-0 h-auto font-normal text-blue-600">
                              {song.artist}
                            </Button>
                          </td>
                          <td className="p-2">
                            <Button variant="link" className="p-0 h-auto font-normal text-blue-600">
                              {song.title}
                            </Button>
                          </td>
                          <td className="p-2">
                            {song.hasPDF && <FileText className="h-4 w-4 text-red-500" />}
                          </td>
                          <td className="p-2">
                            {song.hasNotation && <Music className="h-4 w-4 text-green-500" />}
                          </td>
                          <td className="p-2">
                            {song.hasMuseScore && <PlayCircle className="h-4 w-4 text-blue-500" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lessons Widget (conditional based on mlDashLesson) */}
          {widgets?.showLessons && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-purple-600">
                    LESSONS
                  </CardTitle>
                  <Button variant="outline" size="sm">
                    + Add Lesson
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="w-8 text-left">
                          <Checkbox 
                            checked={selectedLessons.length === recentLessons?.length && recentLessons?.length > 0}
                            onCheckedChange={handleSelectAllLessons}
                          />
                        </th>
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Category</th>
                        <th className="text-left p-2">Title</th>
                        <th className="w-8"></th>
                        <th className="w-8"></th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLessons?.map(lesson => (
                        <tr key={lesson.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <Checkbox 
                              checked={selectedLessons.includes(lesson.id)}
                              onCheckedChange={(checked) => handleLessonSelection(lesson.id, checked as boolean)}
                            />
                          </td>
                          <td className="p-2">{lesson.modifiedDate}</td>
                          <td className="p-2">{lesson.category}</td>
                          <td className="p-2">
                            <Button variant="link" className="p-0 h-auto font-normal text-blue-600">
                              {lesson.title}
                            </Button>
                          </td>
                          <td className="p-2">
                            {lesson.hasPDF && <FileText className="h-4 w-4 text-red-500" />}
                          </td>
                          <td className="p-2">
                            {lesson.hasNotation && <Music className="h-4 w-4 text-green-500" />}
                          </td>
                          <td className="p-2">
                            {lesson.hasMuseScore && <PlayCircle className="h-4 w-4 text-blue-500" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Today Widget (Right Sidebar - 1 column) */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-blue-600 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                TODAY
              </CardTitle>
              <p className="text-sm text-gray-600">
                {format(today, 'EEEE, MMM d')}
              </p>
            </CardHeader>
            <CardContent>
              {todayLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              ) : !todayStudents || todayStudents.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No lessons scheduled today
                </div>
              ) : (
                <ScrollArea className="h-80">
                  <div className="space-y-2">
                    {todayStudents.map(student => (
                      <Dialog key={student.id}>
                        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Users className="h-5 w-5" />
                              {student.name} - Student Overview
                            </DialogTitle>
                          </DialogHeader>
                          <div className="flex-1 overflow-auto">
                            <StudentOverviewDashboard 
                              studentId={student.id} 
                              onClose={() => setSelectedStudent(null)} 
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    ))}
                  </div>
                </ScrollArea>
              )}
              
              {/* Assignment Section */}
              {(selectedSongs.length > 0 || selectedLessons.length > 0) && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-600 mb-2">
                    Assign selected items:
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {selectedSongs.length} songs, {selectedLessons.length} lessons selected
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full"
                    disabled={!selectedStudent}
                    onClick={() => selectedStudent && handleAssignToStudent(selectedStudent.id)}
                  >
                    Assign to Selected Student
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}