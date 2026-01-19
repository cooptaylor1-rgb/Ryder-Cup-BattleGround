/**
 * Error Boundary Component
 *
 * Graceful error handling with golf-themed recovery UI.
 * Catches JavaScript errors and displays friendly fallback.
 */

'use client';

import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import * as Sentry from '@sentry/nextjs';
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

    // Report to Sentry
    Sentry.withScope((scope) => {
      scope.setTag('errorBoundary', 'true');
      scope.setExtra('componentStack', errorInfo.componentStack);
      Sentry.captureException(error);
    });
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

// Compact error display for inline usage
export function MiniErrorFallback({
  message = 'Something went wrong',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
      style={{
        background: 'rgba(220, 38, 38, 0.1)',
        border: '1px solid rgba(220, 38, 38, 0.2)',
      }}
    >
      <AlertTriangle className="w-4 h-4" style={{ color: '#DC2626' }} />
      <span style={{ color: 'var(--ink, #F5F1E8)' }}>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-auto flex items-center gap-1 text-xs font-medium"
          style={{ color: 'var(--masters, #006747)' }}
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      )}
    </div>
  );
}

// Card-style error display
export function ErrorCard({
  title = 'Error',
  message = 'Something went wrong',
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'p-4 rounded-xl flex flex-col items-center text-center',
        className
      )}
      style={{
        background: 'var(--surface, #1A1814)',
        border: '1px solid var(--rule, #3A3530)',
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
        style={{ background: 'rgba(220, 38, 38, 0.1)' }}
      >
        <AlertTriangle className="w-5 h-5" style={{ color: '#DC2626' }} />
      </div>
      <h3
        className="font-medium text-sm mb-1"
        style={{ color: 'var(--ink, #F5F1E8)' }}
      >
        {title}
      </h3>
      <p
        className="text-xs mb-3"
        style={{ color: 'var(--ink-secondary, #B8B0A0)' }}
      >
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: 'var(--masters, #006747)',
            color: 'white',
          }}
        >
          <RefreshCw className="w-3 h-3" />
          Try Again
        </button>
      )}
    </div>
  );
}
