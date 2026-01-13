/**
 * Error Boundary Component
 *
 * Graceful error handling with golf-themed recovery UI.
 * Catches JavaScript errors and displays friendly fallback.
 */

'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { cn } from '@/lib/utils';
import { RefreshCw, Home, AlertCircle, Bug } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    showDetails?: boolean;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

// ============================================
// ERROR BOUNDARY CLASS
// ============================================

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

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ errorInfo });
        this.props.onError?.(error, errorInfo);

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('ErrorBoundary caught an error:', error, errorInfo);
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <ErrorFallback
                    error={this.state.error}
                    errorInfo={this.state.errorInfo}
                    onRetry={this.handleRetry}
                    onGoHome={this.handleGoHome}
                    showDetails={this.props.showDetails}
                />
            );
        }

        return this.props.children;
    }
}

// ============================================
// ERROR FALLBACK UI
// ============================================

interface ErrorFallbackProps {
    error: Error | null;
    errorInfo?: ErrorInfo | null;
    onRetry?: () => void;
    onGoHome?: () => void;
    showDetails?: boolean;
    title?: string;
    description?: string;
}

export function ErrorFallback({
    error,
    errorInfo,
    onRetry,
    onGoHome,
    showDetails = false,
    title = "Something went wrong",
    description = "We hit a rough patch. Try refreshing or head back to safety.",
}: ErrorFallbackProps) {
    return (
        <div className="error-boundary-container">
            {/* Golf ball in the rough illustration */}
            <div className="error-boundary-illustration">
                <svg viewBox="0 0 100 100" className="w-32 h-32 animate-float" aria-hidden="true">
                    {/* Rough/long grass */}
                    <g className="stroke-masters fill-none" strokeWidth="2" strokeLinecap="round">
                        <path d="M10 85 Q12 70 15 85" />
                        <path d="M18 85 Q22 65 25 85" />
                        <path d="M30 85 Q35 60 38 85" />
                        <path d="M42 85 Q48 55 52 85" />
                        <path d="M55 85 Q60 60 65 85" />
                        <path d="M70 85 Q75 65 78 85" />
                        <path d="M82 85 Q86 70 90 85" />
                        {/* Extra blades */}
                        <path d="M25 85 Q30 72 28 85" opacity="0.6" />
                        <path d="M48 85 Q52 68 50 85" opacity="0.6" />
                        <path d="M72 85 Q77 72 75 85" opacity="0.6" />
                    </g>

                    {/* Ball partially hidden in rough */}
                    <circle cx="50" cy="72" r="12" className="fill-white stroke-surface-300" strokeWidth="1.5" />
                    <g className="fill-surface-200">
                        <circle cx="46" cy="68" r="1.5" />
                        <circle cx="54" cy="68" r="1.5" />
                        <circle cx="50" cy="72" r="1.5" />
                        <circle cx="46" cy="76" r="1.5" />
                        <circle cx="54" cy="76" r="1.5" />
                    </g>

                    {/* Exclamation/warning indicator */}
                    <g className="fill-azalea animate-pulse-gentle">
                        <circle cx="75" cy="30" r="12" />
                        <rect x="73" y="22" width="4" height="10" rx="2" className="fill-white" />
                        <circle cx="75" cy="36" r="2" className="fill-white" />
                    </g>
                </svg>
            </div>

            {/* Error message */}
            <h1 className="error-boundary-title">{title}</h1>
            <p className="error-boundary-description">{description}</p>

            {/* Actions */}
            <div className="error-boundary-actions">
                {onRetry && (
                    <button onClick={onRetry} className="error-boundary-button primary">
                        <RefreshCw className="w-5 h-5" />
                        Try Again
                    </button>
                )}
                {onGoHome && (
                    <button onClick={onGoHome} className="error-boundary-button secondary">
                        <Home className="w-5 h-5" />
                        Go Home
                    </button>
                )}
            </div>

            {/* Error details (dev mode) */}
            {showDetails && error && (
                <details className="error-boundary-details">
                    <summary className="error-boundary-details-summary">
                        <Bug className="w-4 h-4" />
                        Technical Details
                    </summary>
                    <div className="error-boundary-details-content">
                        <p className="error-boundary-error-name">{error.name}: {error.message}</p>
                        {errorInfo?.componentStack && (
                            <pre className="error-boundary-stack">
                                {errorInfo.componentStack}
                            </pre>
                        )}
                    </div>
                </details>
            )}
        </div>
    );
}

// ============================================
// MINI ERROR FALLBACK
// For smaller components
// ============================================

interface MiniErrorFallbackProps {
    message?: string;
    onRetry?: () => void;
}

export function MiniErrorFallback({
    message = "Failed to load",
    onRetry,
}: MiniErrorFallbackProps) {
    return (
        <div className="mini-error-fallback">
            <AlertCircle className="w-5 h-5 text-azalea" />
            <span className="text-sm text-ink-secondary">{message}</span>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="text-sm text-masters hover:underline"
                >
                    Retry
                </button>
            )}
        </div>
    );
}

// ============================================
// ERROR CARD
// For inline errors
// ============================================

interface ErrorCardProps {
    title?: string;
    message: string;
    onRetry?: () => void;
    onDismiss?: () => void;
    variant?: 'error' | 'warning' | 'info';
}

export function ErrorCard({
    title,
    message,
    onRetry,
    onDismiss,
    variant = 'error',
}: ErrorCardProps) {
    const variantStyles = {
        error: 'border-azalea/30 bg-azalea/5',
        warning: 'border-gold/30 bg-gold/5',
        info: 'border-masters/30 bg-masters/5',
    };

    const iconColors = {
        error: 'text-azalea',
        warning: 'text-gold',
        info: 'text-masters',
    };

    return (
        <div
            className={cn(
                'error-card',
                variantStyles[variant]
            )}
            role="alert"
        >
            <div className="error-card-content">
                <AlertCircle className={cn('w-5 h-5 flex-shrink-0', iconColors[variant])} />
                <div className="error-card-text">
                    {title && <p className="error-card-title">{title}</p>}
                    <p className="error-card-message">{message}</p>
                </div>
            </div>
            <div className="error-card-actions">
                {onRetry && (
                    <button onClick={onRetry} className="error-card-action">
                        <RefreshCw className="w-4 h-4" />
                        Retry
                    </button>
                )}
                {onDismiss && (
                    <button onClick={onDismiss} className="error-card-dismiss">
                        Dismiss
                    </button>
                )}
            </div>
        </div>
    );
}

export default ErrorBoundary;
