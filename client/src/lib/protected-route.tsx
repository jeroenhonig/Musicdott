import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import AppLayout from "@/components/layouts/app-layout";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading, error } = useAuth();

  // Show loading state while auth status is being determined
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  // Handle authentication errors
  if (error) {
    console.error("Authentication error:", error);
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen flex-col gap-4">
          <div className="text-destructive text-lg">Authentication Error</div>
          <div className="text-muted-foreground">Please try logging in again</div>
          <button 
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md"
            onClick={() => window.location.href = "/auth"}
          >
            Go to Login
          </button>
        </div>
      </Route>
    );
  }

  // Redirect to auth page if not logged in
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Get page title based on path
  const getPageTitle = () => {
    switch (path) {
      case "/":
        return "Dashboard";
      case "/students":
        return "Students";
      case "/songs":
        return "Songs";
      case "/lessons":
        return "Lessons";
      case "/schedule":
        return "Schedule Management";
      case "/real-time":
        return "Real-Time Dashboard";
      default:
        return "MusicDott";
    }
  };

  // Return protected component - let each page handle its own layout
  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}
