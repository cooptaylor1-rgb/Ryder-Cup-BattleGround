/**
 * Error Boundary Component
 *
 * Catches JavaScript errors in child components and displays
 * a beautiful, on-brand fallback UI. Prevents full-app crashes.
 *
 * Features:
 * - Graceful degradation
 * - Retry functionality
 * - Error reporting hook
 * - Masters-inspired styling
 */

'use client';

import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, RefreshCw, Home, ChevronRight } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  variant?: 'default' | 'compact' | 'fullscreen';
  resetKey?: string | number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Call the optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state when resetKey changes
    if (this.props.resetKey !== prevProps.resetKey && this.state.hasError) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });
    }
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showDetails = false, variant = 'default' } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <ErrorFallback
          error={error}
          errorInfo={errorInfo}
          showDetails={showDetails}
          variant={variant}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
        />
      );
    }

    return children;
  }
}

// Error Fallback UI Component
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails?: boolean;
  variant?: 'default' | 'compact' | 'fullscreen';
  onRetry?: () => void;
  onGoHome?: () => void;
}

export function ErrorFallback({
  error,
  errorInfo,
  showDetails = false,
  variant = 'default',
  onRetry,
  onGoHome,
}: ErrorFallbackProps) {
  const isFullscreen = variant === 'fullscreen';
  const isCompact = variant === 'compact';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        isFullscreen && 'fixed inset-0 z-50',
        isCompact ? 'p-4' : 'p-8',
        !isFullscreen && 'rounded-2xl',
      )}
      style={{
        background: isFullscreen ? 'var(--canvas, #0F0D0A)' : 'var(--surface, #1A1814)',
        border: !isFullscreen ? '1px solid var(--rule, #3A3530)' : undefined,
      }}
      role="alert"
      aria-live="assertive"
    >
      {/* Icon */}
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl mb-4',
          isCompact ? 'w-12 h-12' : 'w-16 h-16',
        )}
        style={{
          background: 'rgba(220, 38, 38, 0.1)',
        }}
      >
        <AlertTriangle
          className={isCompact ? 'w-6 h-6' : 'w-8 h-8'}
          style={{ color: '#DC2626' }}
        />
      </div>

      {/* Title */}
      <h2
        className={cn(
          'font-semibold mb-2',
          isCompact ? 'text-base' : 'text-lg',
        )}
        style={{ color: 'var(--ink, #F5F1E8)' }}
      >
        Something went wrong
      </h2>

      {/* Description */}
      <p
        className={cn(
          'max-w-sm mb-6',
          isCompact ? 'text-xs' : 'text-sm',
        )}
        style={{ color: 'var(--ink-secondary, #B8B0A0)' }}
      >
        {error?.message || 'An unexpected error occurred. Please try again.'}
      </p>

      {/* Actions */}
      <div className={cn('flex gap-3', isCompact && 'flex-col w-full')}>
        {onRetry && (
          <button
            onClick={onRetry}
            className={cn(
              'flex items-center justify-center gap-2 px-4 py-2 rounded-lg',
              'font-medium transition-colors',
              isCompact ? 'text-sm' : 'text-base',
            )}
            style={{
              background: 'var(--masters, #006747)',
              color: 'white',
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        )}

        {onGoHome && (
          <button
            onClick={onGoHome}
            className={cn(
              'flex items-center justify-center gap-2 px-4 py-2 rounded-lg',
              'font-medium transition-colors',
              isCompact ? 'text-sm' : 'text-base',
            )}
            style={{
              background: 'var(--surface-elevated, #1E1C18)',
              border: '1px solid var(--rule, #3A3530)',
              color: 'var(--ink, #F5F1E8)',
            }}
          >
            <Home className="w-4 h-4" />
            Go Home
          </button>
        )}
      </div>

      {/* Error Details (Development) */}
      {showDetails && errorInfo && (
        <details
          className="mt-6 w-full max-w-lg text-left"
          style={{
            background: 'var(--surface-elevated, #1E1C18)',
            border: '1px solid var(--rule, #3A3530)',
            borderRadius: '0.5rem',
          }}
        >
          <summary
            className="px-4 py-2 cursor-pointer flex items-center gap-2 text-sm font-medium"
            style={{ color: 'var(--ink-secondary, #B8B0A0)' }}
          >
            <ChevronRight className="w-4 h-4" />
            Error Details
          </summary>
          <div className="px-4 pb-4">
            <pre
              className="text-xs overflow-auto p-3 rounded mt-2"
              style={{
                background: 'var(--canvas, #0F0D0A)',
                color: 'var(--ink-tertiary, #807868)',
                maxHeight: '200px',
              }}
            >
              {error?.stack || 'No stack trace available'}
            </pre>
            <pre
              className="text-xs overflow-auto p-3 rounded mt-2"
              style={{
                background: 'var(--canvas, #0F0D0A)',
                color: 'var(--ink-tertiary, #807868)',
                maxHeight: '200px',
              }}
            >
              {errorInfo.componentStack}
            </pre>
          </div>
        </details>
      )}
    </div>
  );
}

// Hook for functional components to trigger error boundary
export function useErrorHandler() {
  const [, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);

  return handleError;
}

// Higher-order component wrapper
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}

export default ErrorBoundary;
