import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} resetError={this.resetError} />;
      }

      return <DefaultErrorFallback error={this.state.error!} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <Card className="futuristic-card max-w-lg mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Something went wrong
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-blue-200">
          An unexpected error occurred. This might be a temporary issue.
        </p>
        <details className="text-sm">
          <summary className="text-blue-300 cursor-pointer hover:text-blue-200">
            Error details
          </summary>
          <pre className="mt-2 p-2 bg-slate-800 rounded text-xs text-red-300 overflow-auto">
            {error.message}
          </pre>
        </details>
        <Button 
          onClick={resetError}
          className="cyber-button text-white font-semibold w-full"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}

export function QueryErrorFallback({ error, retry }: { error: Error; retry?: () => void }) {
  return (
    <div className="text-center py-8">
      <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-red-400 mb-2">Failed to load data</h3>
      <p className="text-blue-300 mb-4">
        {error.message || 'An error occurred while fetching data'}
      </p>
      {retry && (
        <Button 
          onClick={retry}
          variant="outline"
          className="border-red-500/30 text-red-400 hover:bg-red-900/20"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      )}
    </div>
  );
}