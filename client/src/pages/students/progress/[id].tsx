import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  Trophy, 
  CheckCircle, 
  BarChart2, 
  Music, 
  BookOpen,
  ArrowLeft,
  Award,
  CalendarPlus
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { Student } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import TeacherTabs from "@/components/scheduling/teacher-tabs";
import StudentScheduleForm from "@/components/scheduling/student-schedule-form";

// Format minutes into hours and minutes
function formatPracticeTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export default function StudentProgressPage() {
  const params = useParams();
  const studentId = parseInt(params.id as string);
  const [activeTab, setActiveTab] = useState("overview");
  const [isScheduleFormOpen, setIsScheduleFormOpen] = useState(false);
  
  // Fetch the student details
  const { 
    data: student, 
    isLoading: isLoadingStudent,
    error: studentError
  } = useQuery<Student>({
    queryKey: [`/api/students/${studentId}`],
  });
  
  // Fetch the student progress data
  const { 
    data: progressData, 
    isLoading: isLoadingProgress,
    error: progressError
  } = useQuery({
    queryKey: [`/api/students/${studentId}/progress`],
    enabled: !!studentId
  });
  
  const isLoading = isLoadingStudent || isLoadingProgress;
  
  // If there's an error fetching the student
  if (studentError) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold text-red-500 mb-2">Error Loading Student</h1>
        <p className="mb-4">There was a problem loading the student information.</p>
        <Button asChild>
          <Link to="/students">Back to Students</Link>
        </Button>
      </div>
    );
  }
  
  // Transform the practice data for the chart
  const practiceChartData = progressData 
    ? Object.entries(progressData.practiceStats.byDay)
      .map(([date, minutes]) => ({
        date: format(new Date(date), 'MMM dd'),
        minutes
      }))
      .slice(-14) // Last 14 days
    : [];
  
  // Transform the skills data for the radar chart
  const skillsRadarData = progressData
    ? progressData.skillsMastery.map(skill => ({
        subject: skill.skill.charAt(0).toUpperCase() + skill.skill.slice(1),
        A: skill.mastery,
        fullMark: 100
      }))
    : [];
  
  // Data for the assignment pie chart
  const assignmentPieData = progressData
    ? [
        { name: 'Completed', value: progressData.overallProgress.completedAssignments },
        { name: 'Pending', value: progressData.overallProgress.totalAssignments - progressData.overallProgress.completedAssignments }
      ]
    : [];
  
  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Button variant="outline" asChild className="mb-4">
          <Link to={`/students`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Students
          </Link>
        </Button>
        
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isLoadingStudent ? (
                <Skeleton className="h-9 w-40" />
              ) : (
                <>Student Progress: {student?.name || ''}</>
              )}
            </h1>
            <p className="text-muted-foreground">
              {isLoadingStudent ? (
                <Skeleton className="h-5 w-60 mt-1" />
              ) : (
                <>
                  {student?.instrument || ''} · 
                  {student?.level || ''} level
                </>
              )}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              className="bg-primary text-white flex items-center" 
              onClick={() => setIsScheduleFormOpen(true)}
            >
              <CalendarPlus className="mr-2 h-4 w-4" />
              Schedule Lessons
            </Button>
            
            {isLoading || !progressData ? (
              <Skeleton className="h-10 w-28" />
            ) : (
              <Badge className="text-lg py-2 px-3 bg-gradient-to-r from-blue-500 to-purple-500">
                <Trophy className="mr-1 h-4 w-4" />
                {progressData.achievements.total} Achievements
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      {/* Schedule Form Dialog */}
      {student && (
        <StudentScheduleForm 
          isOpen={isScheduleFormOpen}
          onClose={() => setIsScheduleFormOpen(false)}
          studentId={studentId}
          studentName={student.name}
        />
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="practice">Practice Analysis</TabsTrigger>
          <TabsTrigger value="skills">Skills Mastery</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {isLoading || !progressData ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-80 w-full" />
                <Skeleton className="h-80 w-full" />
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{progressData.overallProgress.completionRate}%</div>
                    <Progress className="mt-2" value={progressData.overallProgress.completionRate} />
                    <p className="text-xs text-muted-foreground mt-2">
                      {progressData.overallProgress.completedAssignments} of {progressData.overallProgress.totalAssignments} assignments completed
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Practice Time</CardTitle>
                    <Clock className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPracticeTime(progressData.overallProgress.totalPracticeTime)}</div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Across {progressData.overallProgress.totalPracticeSessions} practice sessions
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Session</CardTitle>
                    <BarChart2 className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPracticeTime(progressData.overallProgress.averagePracticeTimePerSession)}</div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Average time per practice session
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Scheduled Sessions</CardTitle>
                    <Calendar className="h-4 w-4 text-amber-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{progressData.overallProgress.totalScheduledSessions}</div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Total scheduled lessons
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>
                      Practice sessions and completed assignments
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {progressData.practiceStats.recentSessions.slice(0, 3).map((session) => (
                        <div key={session.id} className="flex items-center">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
                            <Music className="h-5 w-5 text-blue-700" />
                          </div>
                          <div className="ml-4 space-y-1">
                            <p className="text-sm font-medium">Practice Session</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(session.startTime), 'MMM dd, yyyy h:mm a')} · 
                              {formatPracticeTime(
                                (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 
                                (1000 * 60)
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                      
                      {progressData.assignmentDetails.completed.slice(0, 2).map((assignment) => (
                        <div key={assignment.id} className="flex items-center">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
                            <CheckCircle className="h-5 w-5 text-green-700" />
                          </div>
                          <div className="ml-4 space-y-1">
                            <p className="text-sm font-medium">Assignment Completed</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(assignment.completedDate!), 'MMM dd, yyyy')} ·
                              {assignment.songId ? " Song" : " Lesson"} assignment
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Assignment Status</CardTitle>
                    <CardDescription>
                      Completed vs. pending assignments
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <div className="h-[200px] w-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={assignmentPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {assignmentPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#4ade80' : '#f87171'} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
        
        {/* Practice Analysis Tab */}
        <TabsContent value="practice" className="space-y-6">
          {isLoading || !progressData ? (
            <Skeleton className="h-[450px] w-full" />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Practice Time Trend</CardTitle>
                <CardDescription>
                  Minutes of practice over the last 14 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={practiceChartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        angle={-45} 
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} minutes`, 'Practice Time']} />
                      <Legend />
                      <Bar dataKey="minutes" name="Practice Time (minutes)" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
          
          {isLoading || !progressData ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-80 w-full" />
              <Skeleton className="h-80 w-full" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Practice Statistics</CardTitle>
                  <CardDescription>
                    Key metrics about practice habits
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Practice Time:</span>
                      <span>{formatPracticeTime(progressData.overallProgress.totalPracticeTime)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Practice Sessions:</span>
                      <span>{progressData.overallProgress.totalPracticeSessions}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Average Session Length:</span>
                      <span>{formatPracticeTime(progressData.overallProgress.averagePracticeTimePerSession)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Practice Consistency:</span>
                      <span>
                        {Object.values(progressData.practiceStats.byDay).filter(mins => mins > 0).length} 
                        {' '}of{' '}
                        {Object.keys(progressData.practiceStats.byDay).length} days
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recent Practice Sessions</CardTitle>
                  <CardDescription>
                    Latest recorded sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {progressData.practiceStats.recentSessions.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground">No practice sessions recorded yet</p>
                      </div>
                    ) : (
                      progressData.practiceStats.recentSessions.slice(0, 5).map((session) => (
                        <div key={session.id} className="border-b pb-3 last:border-0">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">
                                {format(new Date(session.startTime), 'MMM dd, yyyy')}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(session.startTime), 'h:mm a')} - 
                                {format(new Date(session.endTime), 'h:mm a')}
                              </p>
                            </div>
                            <Badge>
                              {formatPracticeTime(
                                (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 
                                (1000 * 60)
                              )}
                            </Badge>
                          </div>
                          {session.notes && (
                            <p className="text-sm mt-1">{session.notes}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        
        {/* Skills Mastery Tab */}
        <TabsContent value="skills" className="space-y-6">
          {isLoading || !progressData ? (
            <Skeleton className="h-[450px] w-full" />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Skills Mastery Overview</CardTitle>
                <CardDescription>
                  Progress across different skill areas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillsRadarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar
                        name="Mastery"
                        dataKey="A"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                      <Tooltip formatter={(value) => [`${value}%`, 'Mastery']} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
          
          {isLoading || !progressData ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-80 w-full" />
              <Skeleton className="h-80 w-full" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Skills Breakdown</CardTitle>
                  <CardDescription>
                    Detailed progress for each skill area
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {progressData.skillsMastery.map((skill, index) => (
                      <div key={skill.skill} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium capitalize">{skill.skill}</span>
                          <Badge variant={skill.mastery >= 70 ? "default" : "secondary"}>
                            {skill.mastery}% Mastery
                          </Badge>
                        </div>
                        <Progress value={skill.mastery} 
                          className={`h-2 ${
                            skill.mastery >= 80 ? "bg-green-100" : 
                            skill.mastery >= 60 ? "bg-blue-100" : 
                            skill.mastery >= 40 ? "bg-amber-100" : "bg-red-100"
                          }`}
                        />
                        <p className="text-xs text-muted-foreground">
                          {skill.completedLessons} of {skill.totalLessons} lessons completed
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recommended Focus Areas</CardTitle>
                  <CardDescription>
                    Suggested areas for improvement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {progressData.skillsMastery
                      .sort((a, b) => a.mastery - b.mastery)
                      .slice(0, 3)
                      .map((skill) => (
                        <div key={`focus-${skill.skill}`} className="border rounded-lg p-4">
                          <h4 className="font-semibold capitalize flex items-center">
                            <BookOpen className="h-4 w-4 mr-2 text-primary" />
                            {skill.skill}
                          </h4>
                          <p className="text-sm mt-1">
                            This area needs more focus. Consider assigning more lessons related to {skill.skill}.
                          </p>
                          <div className="mt-2">
                            <Button variant="outline" size="sm">
                              View Lessons
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        
        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-6">
          {isLoading || !progressData ? (
            <Skeleton className="h-[450px] w-full" />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Achievements Gallery</CardTitle>
                <CardDescription>
                  Badges and milestones earned
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.entries(progressData.achievements.byType).length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                    <h3 className="font-medium text-lg">No Achievements Yet</h3>
                    <p className="text-muted-foreground">
                      Complete assignments and maintain practice streaks to earn achievements.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(progressData.achievements.byType).map(([type, achievements]) => (
                      <div key={type}>
                        <h3 className="font-medium text-lg capitalize mb-3">
                          {type.replace('_', ' ')} Achievements
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {achievements.map((achievement) => (
                            <div 
                              key={achievement.id} 
                              className="border rounded-lg p-4 flex flex-col items-center text-center hover:bg-muted transition-colors"
                            >
                              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                                <Award className="h-6 w-6 text-primary" />
                              </div>
                              <h4 className="font-medium">{achievement.name}</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {achievement.description}
                              </p>
                              <p className="text-xs mt-2">
                                {format(new Date(achievement.dateEarned), 'MMM dd, yyyy')}
                              </p>
                              {achievement.isNew && (
                                <Badge className="mt-2 bg-green-100 text-green-800 hover:bg-green-200">New</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {isLoading || !progressData ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-60 w-full" />
              <Skeleton className="h-60 w-full" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Achievement Status</CardTitle>
                  <CardDescription>
                    Overall achievement progress
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between">
                        <span className="font-medium">Total Achievements</span>
                        <span>{progressData.achievements.total}</span>
                      </div>
                      <Progress className="mt-2" value={Math.min(progressData.achievements.total * 10, 100)} />
                      <p className="text-xs text-muted-foreground mt-1">
                        Earning achievements unlocks special recognition
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Achievement Types</h4>
                      <div className="space-y-2">
                        {Object.entries(progressData.achievements.byType).map(([type, achievements]) => (
                          <div key={`type-${type}`} className="flex justify-between items-center">
                            <span className="capitalize">
                              {type.replace('_', ' ')}
                            </span>
                            <Badge variant="outline">{achievements.length}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recent Achievements</CardTitle>
                  <CardDescription>
                    Latest milestones earned
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {progressData.achievements.recent.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground">No achievements earned yet</p>
                      </div>
                    ) : (
                      progressData.achievements.recent.map((achievement) => (
                        <div key={`recent-${achievement.id}`} className="flex items-start border-b pb-3 last:border-0">
                          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center mr-3 mt-1">
                            <Award className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center">
                              <h4 className="font-medium">{achievement.name}</h4>
                              {achievement.isNew && (
                                <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-200">New</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {achievement.description}
                            </p>
                            <p className="text-xs mt-1">
                              {format(new Date(achievement.dateEarned), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        
        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-6">
          {isLoadingStudent ? (
            <Skeleton className="h-[450px] w-full" />
          ) : student ? (
            <Card>
              <CardHeader>
                <CardTitle>Lesson Scheduling</CardTitle>
                <CardDescription>
                  Manage recurring lesson schedules and upcoming sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TeacherTabs studentId={studentId} student={student} />
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
              <h3 className="font-medium text-lg">Student Not Found</h3>
              <p className="text-muted-foreground mb-4">
                Unable to load student information for scheduling.
              </p>
              <Button asChild>
                <Link to="/students">Back to Students</Link>
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}