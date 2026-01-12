/**
 * Toast Component
 *
 * Toast notifications for feedback and alerts.
 * Auto-dismiss with manual dismiss option.
 */

'use client';

import { useUIStore } from '@/lib/stores';
import { cn } from '@/lib/utils';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ToastItemProps {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    onDismiss: () => void;
}

function ToastItem({ id, type, message, onDismiss }: ToastItemProps) {
    const [isExiting, setIsExiting] = useState(false);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(onDismiss, 200);
    };

    const icons = {
        success: CheckCircle,
        error: AlertCircle,
        info: Info,
        warning: AlertTriangle,
    };

    const Icon = icons[type];

    const colors = {
        success: 'bg-green-600 text-white',
        error: 'bg-red-600 text-white',
        info: 'bg-blue-600 text-white',
        warning: 'bg-yellow-500 text-yellow-900',
    };

    return (
        <div
            className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg',
                'min-w-[280px] max-w-[400px]',
                'transition-all duration-200',
                colors[type],
                isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
            )}
            role="alert"
        >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <p className="flex-1 text-sm font-medium">{message}</p>
            <button
                onClick={handleDismiss}
                className="p-1 rounded-full hover:bg-black/10 transition-colors"
                aria-label="Dismiss"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

export function ToastContainer() {
    const { toasts, dismissToast } = useUIStore();

    if (toasts.length === 0) return null;

    return (
        <div
            className="fixed top-4 right-4 z-50 flex flex-col gap-2"
            aria-live="polite"
            aria-label="Notifications"
        >
            {toasts.map(toast => (
                <ToastItem
                    key={toast.id}
                    id={toast.id}
                    type={toast.type}
                    message={toast.message}
                    onDismiss={() => dismissToast(toast.id)}
                />
            ))}
        </div>
    );
}

export default ToastContainer;
