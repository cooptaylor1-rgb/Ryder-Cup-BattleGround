/**
 * Tabs Component
 *
 * Accessible tab navigation with keyboard support.
 * Spotify-inspired styling with smooth transitions.
 */

'use client';

import {
    createContext,
    useContext,
    useState,
    type ReactNode,
    type KeyboardEvent,
    useRef,
} from 'react';
import { cn } from '@/lib/utils';

// ============================================
// CONTEXT
// ============================================

interface TabsContextValue {
    activeTab: string;
    setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
    const context = useContext(TabsContext);
    if (!context) {
        throw new Error('Tabs components must be used within a Tabs provider');
    }
    return context;
}

// ============================================
// TABS ROOT
// ============================================

export interface TabsProps {
    defaultValue: string;
    value?: string;
    onValueChange?: (value: string) => void;
    children: ReactNode;
    className?: string;
}

export function Tabs({
    defaultValue,
    value,
    onValueChange,
    children,
    className,
}: TabsProps) {
    const [internalValue, setInternalValue] = useState(defaultValue);
    const activeTab = value ?? internalValue;

    const setActiveTab = (id: string) => {
        if (!value) {
            setInternalValue(id);
        }
        onValueChange?.(id);
    };

    return (
        <TabsContext.Provider value={{ activeTab, setActiveTab }}>
            <div className={className}>{children}</div>
        </TabsContext.Provider>
    );
}

// ============================================
// TAB LIST
// ============================================

export interface TabListProps {
    children: ReactNode;
    className?: string;
    variant?: 'default' | 'pills' | 'underline';
}

export function TabList({ children, className, variant = 'default' }: TabListProps) {
    const tabListRef = useRef<HTMLDivElement>(null);

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        const tabs = tabListRef.current?.querySelectorAll<HTMLButtonElement>(
            '[role="tab"]:not([disabled])'
        );
        if (!tabs) return;

        const currentIndex = Array.from(tabs).findIndex(
            (tab) => tab === document.activeElement
        );

        let nextIndex: number;

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
                tabs[nextIndex].focus();
                break;
            case 'ArrowRight':
                e.preventDefault();
                nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
                tabs[nextIndex].focus();
                break;
            case 'Home':
                e.preventDefault();
                tabs[0].focus();
                break;
            case 'End':
                e.preventDefault();
                tabs[tabs.length - 1].focus();
                break;
        }
    };

    return (
        <div
            ref={tabListRef}
            role="tablist"
            aria-orientation="horizontal"
            onKeyDown={handleKeyDown}
            className={cn(
                'flex items-center gap-1',
                variant === 'default' && 'p-1 bg-[var(--surface-secondary)] rounded-lg',
                variant === 'pills' && 'gap-2',
                variant === 'underline' && 'border-b border-[var(--rule)] gap-0',
                className
            )}
        >
            {children}
        </div>
    );
}

// ============================================
// TAB TRIGGER
// ============================================

export interface TabTriggerProps {
    value: string;
    children: ReactNode;
    disabled?: boolean;
    className?: string;
}

export function TabTrigger({
    value,
    children,
    disabled = false,
    className,
}: TabTriggerProps) {
    const { activeTab, setActiveTab } = useTabsContext();
    const isActive = activeTab === value;

    return (
        <button
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${value}`}
            tabIndex={isActive ? 0 : -1}
            disabled={disabled}
            onClick={() => setActiveTab(value)}
            className={cn(
                // Base styles
                'relative px-4 py-2 text-sm font-medium rounded-md',
                'transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--canvas)]',
                'disabled:pointer-events-none disabled:opacity-50',

                // Active state
                isActive
                    ? 'bg-[var(--surface-raised)] text-[var(--ink-primary)] shadow-sm'
                    : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[color:var(--surface-raised)]/50',

                className
            )}
        >
            {children}
        </button>
    );
}

// ============================================
// TAB CONTENT
// ============================================

export interface TabContentProps {
    value: string;
    children: ReactNode;
    className?: string;
}

export function TabContent({ value, children, className }: TabContentProps) {
    const { activeTab } = useTabsContext();
    const isActive = activeTab === value;

    if (!isActive) return null;

    return (
        <div
            role="tabpanel"
            id={`panel-${value}`}
            aria-labelledby={`tab-${value}`}
            tabIndex={0}
            className={cn(
                'mt-4 focus-visible:outline-none',
                'animate-fade-in',
                className
            )}
        >
            {children}
        </div>
    );
}

export default Tabs;
