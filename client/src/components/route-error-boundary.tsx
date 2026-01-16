import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, RefreshCcw } from "lucide-react";
import { useLocation } from "wouter";

interface RouteErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  showHomeButton?: boolean;
}

export class RouteErrorBoundary extends React.Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[RouteErrorBoundary] Error in route:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    // Send error to monitoring service in production
    if (import.meta.env.MODE === 'production') {
      // TODO: Integrate with error monitoring service (e.g., Sentry)
      console.error('[Production Error]', { error, errorInfo });
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const {
        fallbackTitle = "Something went wrong",
        fallbackMessage = "We encountered an error while loading this page.",
        showHomeButton = true
      } = this.props;

      return (
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <div className="text-center max-w-lg space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-4">
                <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                {fallbackTitle}
              </h2>
              <p className="text-muted-foreground">
                {fallbackMessage}
              </p>
              
              {import.meta.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Error Details (Dev Only)
                  </summary>
                  <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-auto max-h-48">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex gap-3 justify-center">
              <Button 
                onClick={this.resetError}
                variant="default"
                size="lg"
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              
              {showHomeButton && (
                <Button 
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  size="lg"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook-based wrapper for functional component usage
export function WithErrorBoundary({
  children,
  ...props
}: RouteErrorBoundaryProps) {
  return (
    <RouteErrorBoundary {...props}>
      {children}
    </RouteErrorBoundary>
  );
}
