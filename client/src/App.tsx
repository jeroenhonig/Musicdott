import { Switch } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { ProtectedRoute } from "@/lib/protected-route";
import { Route } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import { RouteErrorBoundary } from "@/components/route-error-boundary";
import { LanguageProvider } from "@/components/language/language-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth-page";
import SignupPage from "@/pages/signup-page";
import StudentsPage from "@/pages/students";
import StudentDetailsPage from "@/pages/students/student-details";
import SongsPage from "@/pages/songs";
import LessonsPage from "@/pages/lessons";
import RealTimeDashboard from "@/pages/real-time-dashboard";
import SchedulePage from "@/pages/schedule";
import ReportsPage from "@/pages/reports-page";
import AnalyticsPage from "@/pages/analytics";
import SettingsPage from "@/pages/settings-page";
import BillingPage from "@/pages/billing";

// Student-specific pages
import MyLessonsPage from "@/pages/student/my-lessons";
import MyAssignmentsPage from "@/pages/student/my-assignments";
import MySchedulePage from "@/pages/student/my-schedule";
import PracticeSessionsPage from "@/pages/student/practice-sessions";
import AchievementsPage from "@/pages/student/achievements";
import AskTeacherPage from "@/pages/student/ask-teacher";
import StudentLessonView from "@/pages/student/lesson-view";
import StudentSongView from "@/pages/student/song-view";
import MessagesPage from "@/pages/messages";
import MessagingPage from "@/pages/messaging";
import ImportPage from "@/pages/import";
import ResourcesPage from "@/pages/resources-page";
import SearchPage from "@/pages/search";
import OwnersDashboard from "@/pages/owners-dashboard";
import SchoolDashboard from "@/pages/school-dashboard";
import OwnerLogin from "@/pages/owner-login";
import CategoriesPage from "@/pages/admin/categories";
import DebugPanel from "@/pages/admin/debug-panel";
import GrooveDemo from "@/pages/groove-demo";
import PerformancePage from "@/pages/performance";
import AIDashboardPage from "@/pages/ai-dashboard";
import GrooveConverterPage from "@/pages/groove-converter";
import CollaborativeNotationPage from "@/pages/collaborative-notation";
import SchoolBrandingPage from "@/pages/SchoolBranding";
import SchoolMembers from "@/pages/school/members";
import { PWAInstallPrompt, PWAServiceWorker } from "@/components/pwa/install-prompt";

// New enhancement pages
import MetronomePage from "@/pages/tools/metronome-page";
import AvatarPage from "@/pages/profile/avatar-page";
import RewardsPage from "@/pages/rewards/rewards-page";

// Music notation pages
import SheetMusicPage from "@/pages/sheet-music-page";
import TablaturePage from "@/pages/tablature-page";
import ABCNotationPage from "@/pages/abc-notation-page";
import FlatEmbedPage from "@/pages/flat-embed-page";
import SpeechToNotePage from "@/pages/speech-to-note-page";

// Global Real-time Sync Provider Component
function RealtimeSyncProvider({ children }: { children: React.ReactNode }) {
  // Initialize global real-time sync - this will auto-connect when user is authenticated
  const { connectionInfo, isConnected } = useRealtimeSync({
    autoConnect: true,
    enableDebugLogs: import.meta.env.NODE_ENV === 'development',
    maxReconnectAttempts: 5,
    batchInvalidationDelay: 100
  });

  // Optional: Log connection status for debugging
  if (import.meta.env.NODE_ENV === 'development') {
    console.log('[App] Real-time sync status:', { isConnected, error: connectionInfo.error });
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <ProtectedRoute 
        path="/" 
        component={() => (
          <RouteErrorBoundary fallbackTitle="Dashboard Error" fallbackMessage="Unable to load dashboard. Please try again.">
            <Dashboard />
          </RouteErrorBoundary>
        )} 
      />
      
      {/* Teacher/School routes */}
      <ProtectedRoute 
        path="/students" 
        component={() => (
          <RouteErrorBoundary fallbackTitle="Students Error" fallbackMessage="Unable to load students. Please try again.">
            <StudentsPage />
          </RouteErrorBoundary>
        )} 
      />
      <ProtectedRoute 
        path="/students/:id" 
        component={() => (
          <RouteErrorBoundary fallbackTitle="Student Details Error" fallbackMessage="Unable to load student details. Please try again.">
            <StudentDetailsPage />
          </RouteErrorBoundary>
        )} 
      />
      <ProtectedRoute 
        path="/songs" 
        component={() => (
          <RouteErrorBoundary fallbackTitle="Songs Error" fallbackMessage="Unable to load songs. Please try again.">
            <SongsPage />
          </RouteErrorBoundary>
        )} 
      />
      <ProtectedRoute 
        path="/lessons" 
        component={() => (
          <RouteErrorBoundary fallbackTitle="Lessons Error" fallbackMessage="Unable to load lessons. Please try again.">
            <LessonsPage />
          </RouteErrorBoundary>
        )} 
      />
      <ProtectedRoute path="/analytics" component={AnalyticsPage} />
      {/* Redirects for backward compatibility */}
      <ProtectedRoute path="/reports" component={AnalyticsPage} />
      <ProtectedRoute path="/performance" component={AnalyticsPage} />
      <ProtectedRoute path="/groove-demo" component={GrooveDemo} />
      <ProtectedRoute path="/search" component={SearchPage} />
      <ProtectedRoute path="/schedule" component={SchedulePage} />
      <ProtectedRoute path="/real-time" component={RealTimeDashboard} />
      <ProtectedRoute path="/billing" component={BillingPage} />
      <ProtectedRoute path="/messaging" component={MessagingPage} />
      <ProtectedRoute path="/messages" component={MessagesPage} />
      <ProtectedRoute path="/import" component={ImportPage} />
      {/* School Branding Routes */}
      <ProtectedRoute path="/branding" component={SchoolBrandingPage} />
      <ProtectedRoute path="/school-settings" component={SchoolBrandingPage} />
      <ProtectedRoute path="/school/settings" component={SchoolBrandingPage} />
      <ProtectedRoute path="/school-branding" component={SchoolBrandingPage} />
      
      {/* School Management Routes */}
      <ProtectedRoute path="/school/members" component={SchoolMembers} />
      
      {/* Special hidden owner route */}
      <Route path="/owner" component={OwnerLogin} />
      <ProtectedRoute path="/owners-dashboard" component={OwnersDashboard} />
      <ProtectedRoute path="/school-dashboard" component={SchoolDashboard} />
      
      {/* Student-specific routes */}
      <ProtectedRoute path="/my-lessons" component={MyLessonsPage} />
      <ProtectedRoute path="/my-assignments" component={MyAssignmentsPage} />
      <ProtectedRoute path="/my-schedule" component={MySchedulePage} />
      <ProtectedRoute path="/practice-sessions" component={PracticeSessionsPage} />
      <ProtectedRoute path="/achievements" component={AchievementsPage} />
      <ProtectedRoute path="/ask-teacher" component={AskTeacherPage} />
      
      {/* Content viewing routes */}
      <ProtectedRoute path="/lessons/:id/view" component={StudentLessonView} />
      <ProtectedRoute path="/songs/:id/view" component={StudentSongView} />
      
      <ProtectedRoute path="/resources" component={ResourcesPage} />
      <ProtectedRoute path="/admin/categories" component={CategoriesPage} />
      <ProtectedRoute path="/admin/debug" component={DebugPanel} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      
      {/* AI and GrooveScribe Tools */}
      <ProtectedRoute path="/ai-dashboard" component={AIDashboardPage} />
      <ProtectedRoute path="/groove-converter" component={GrooveConverterPage} />
      <ProtectedRoute path="/notation" component={CollaborativeNotationPage} />
      
      {/* New Enhancement Features */}
      <ProtectedRoute path="/metronome" component={MetronomePage} />
      <ProtectedRoute path="/tools/metronome" component={MetronomePage} />
      <ProtectedRoute path="/avatar" component={AvatarPage} />
      <ProtectedRoute path="/profile/avatar" component={AvatarPage} />
      <ProtectedRoute path="/rewards" component={RewardsPage} />
      <ProtectedRoute path="/store" component={RewardsPage} />
      
      {/* Music Notation Features */}
      <ProtectedRoute path="/sheet-music" component={SheetMusicPage} />
      <ProtectedRoute path="/tablature" component={TablaturePage} />
      <ProtectedRoute path="/tabs" component={TablaturePage} />
      <ProtectedRoute path="/abc-notation" component={ABCNotationPage} />
      <ProtectedRoute path="/abc" component={ABCNotationPage} />
      <ProtectedRoute path="/flat" component={FlatEmbedPage} />
      <ProtectedRoute path="/flat-embed" component={FlatEmbedPage} />
      <ProtectedRoute path="/speech-to-note" component={SpeechToNotePage} />
      <ProtectedRoute path="/transcribe" component={SpeechToNotePage} />
      
      <Route path="/auth" component={AuthPage} />
      <Route path="/signup" component={SignupPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <RealtimeSyncProvider>
              <ThemeProvider>
                <TooltipProvider>
                  {/* Only enable PWA in production to avoid caching issues in development */}
                  {import.meta.env.MODE === 'production' && <PWAServiceWorker />}
                  <Toaster />
                  <Router />
                  {import.meta.env.MODE === 'production' && <PWAInstallPrompt />}
                </TooltipProvider>
              </ThemeProvider>
            </RealtimeSyncProvider>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
