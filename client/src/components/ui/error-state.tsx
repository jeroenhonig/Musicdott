import { AlertCircle, RefreshCcw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  isOffline?: boolean;
  className?: string;
}

export function ErrorState({
  title = "Unable to load data",
  message = "Something went wrong while loading this content.",
  onRetry,
  isOffline = false,
  className = ""
}: ErrorStateProps) {
  const Icon = isOffline ? WifiOff : AlertCircle;
  const offlineTitle = "You're offline";
  const offlineMessage = "Check your internet connection and try again.";

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-3 mb-4">
        <Icon className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {isOffline ? offlineTitle : title}
      </h3>
      
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        {isOffline ? offlineMessage : message}
      </p>

      {onRetry && (
        <Button onClick={onRetry} variant="default" size="sm">
          <RefreshCcw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}

interface QueryErrorStateProps {
  error: Error;
  onRetry?: () => void;
}

export function QueryErrorState({ error, onRetry }: QueryErrorStateProps) {
  const isNetworkError = error.message.toLowerCase().includes('network') || 
                        error.message.toLowerCase().includes('fetch');
  const isOffline = !navigator.onLine;

  return (
    <ErrorState
      title={isNetworkError ? "Connection Error" : "Error Loading Data"}
      message={error.message || "An unexpected error occurred"}
      onRetry={onRetry}
      isOffline={isOffline}
    />
  );
}
