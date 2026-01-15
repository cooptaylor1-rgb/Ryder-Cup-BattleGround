/**
 * PageTransitions Component — Phase 4: Polish & Delight
 *
 * Smooth page transitions and navigation animations:
 * - FadeIn/FadeOut transitions
 * - SlideUp for modals and sheets
 * - SlideHorizontal for page navigation
 * - ScaleUp for focused content
 * - Staggered list animations
 *
 * Creates fluid navigation experience.
 */

'use client';

import { ReactNode, createContext, useContext } from 'react';
import { motion, AnimatePresence, Variants, Transition } from 'framer-motion';

// ============================================
// TRANSITION VARIANTS
// ============================================

export const fadeVariants: Variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
};

export const slideUpVariants: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
};

export const slideDownVariants: Variants = {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
};

export const slideLeftVariants: Variants = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
};

export const slideRightVariants: Variants = {
    initial: { opacity: 0, x: -30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 30 },
};

export const scaleUpVariants: Variants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
};

export const scaleDownVariants: Variants = {
    initial: { opacity: 0, scale: 1.05 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 },
};

export const popInVariants: Variants = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
};

// ============================================
// TRANSITION CONFIGS
// ============================================

export const springTransition: Transition = {
    type: 'spring',
    damping: 25,
    stiffness: 300,
};

export const smoothTransition: Transition = {
    type: 'tween',
    ease: 'easeOut',
    duration: 0.3,
};

export const quickTransition: Transition = {
    type: 'tween',
    ease: 'easeOut',
    duration: 0.2,
};

export const slowTransition: Transition = {
    type: 'tween',
    ease: 'easeInOut',
    duration: 0.5,
};

// ============================================
// PAGE TRANSITION WRAPPER
// ============================================

export type TransitionType =
    | 'fade'
    | 'slideUp'
    | 'slideDown'
    | 'slideLeft'
    | 'slideRight'
    | 'scaleUp'
    | 'scaleDown'
    | 'popIn';

interface PageTransitionProps {
    children: ReactNode;
    type?: TransitionType;
    transition?: Transition;
    className?: string;
    key?: string;
}

const variantMap: Record<TransitionType, Variants> = {
    fade: fadeVariants,
    slideUp: slideUpVariants,
    slideDown: slideDownVariants,
    slideLeft: slideLeftVariants,
    slideRight: slideRightVariants,
    scaleUp: scaleUpVariants,
    scaleDown: scaleDownVariants,
    popIn: popInVariants,
};

export function PageTransition({
    children,
    type = 'fade',
    transition = smoothTransition,
    className,
}: PageTransitionProps) {
    return (
        <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={variantMap[type]}
            transition={transition}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// ============================================
// ANIMATED PRESENCE WRAPPER
// ============================================

interface TransitionPresenceProps {
    children: ReactNode;
    mode?: 'wait' | 'sync' | 'popLayout';
    initial?: boolean;
}

export function TransitionPresence({
    children,
    mode = 'wait',
    initial = true,
}: TransitionPresenceProps) {
    return (
        <AnimatePresence mode={mode} initial={initial}>
            {children}
        </AnimatePresence>
    );
}

// ============================================
// STAGGERED CONTAINER
// ============================================

interface StaggeredContainerProps {
    children: ReactNode;
    staggerDelay?: number;
    delayChildren?: number;
    className?: string;
}

export function StaggeredContainer({
    children,
    staggerDelay = 0.05,
    delayChildren = 0.1,
    className,
}: StaggeredContainerProps) {
    return (
        <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={{
                initial: {},
                animate: {
                    transition: {
                        staggerChildren: staggerDelay,
                        delayChildren,
                    },
                },
                exit: {
                    transition: {
                        staggerChildren: staggerDelay * 0.5,
                        staggerDirection: -1,
                    },
                },
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// ============================================
// STAGGERED ITEM
// ============================================

interface StaggeredItemProps {
    children: ReactNode;
    type?: TransitionType;
    className?: string;
}

export function StaggeredItem({
    children,
    type = 'slideUp',
    className,
}: StaggeredItemProps) {
    return (
        <motion.div
            variants={variantMap[type]}
            transition={smoothTransition}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// ============================================
// MODAL TRANSITION
// ============================================

interface ModalTransitionProps {
    children: ReactNode;
    isOpen: boolean;
    onClose?: () => void;
}

export function ModalTransition({ children, isOpen, onClose }: ModalTransitionProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={quickTransition}
                        className="fixed inset-0 z-50"
                        style={{ background: 'rgba(0, 0, 0, 0.5)' }}
                        onClick={onClose}
                    />

                    {/* Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={springTransition}
                        className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-h-[80vh] overflow-auto rounded-2xl"
                        style={{ background: 'var(--surface)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ============================================
// SHEET TRANSITION (Bottom Sheet)
// ============================================

interface SheetTransitionProps {
    children: ReactNode;
    isOpen: boolean;
    onClose?: () => void;
    height?: string | number;
}

export function SheetTransition({
    children,
    isOpen,
    onClose,
    height = '80vh',
}: SheetTransitionProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={quickTransition}
                        className="fixed inset-0 z-50"
                        style={{ background: 'rgba(0, 0, 0, 0.5)' }}
                        onClick={onClose}
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={springTransition}
                        className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl overflow-hidden"
                        style={{ background: 'var(--surface)', maxHeight: height }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Handle */}
                        <div className="flex justify-center py-3">
                            <div
                                className="w-10 h-1 rounded-full"
                                style={{ background: 'var(--rule)' }}
                            />
                        </div>
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ============================================
// SLIDE OVER (Side Panel)
// ============================================

interface SlideOverProps {
    children: ReactNode;
    isOpen: boolean;
    onClose?: () => void;
    side?: 'left' | 'right';
    width?: string | number;
}

export function SlideOver({
    children,
    isOpen,
    onClose,
    side = 'right',
    width = '320px',
}: SlideOverProps) {
    const slideVariants: Variants = {
        initial: { x: side === 'right' ? '100%' : '-100%' },
        animate: { x: 0 },
        exit: { x: side === 'right' ? '100%' : '-100%' },
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={quickTransition}
                        className="fixed inset-0 z-50"
                        style={{ background: 'rgba(0, 0, 0, 0.5)' }}
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={slideVariants}
                        transition={springTransition}
                        className="fixed inset-y-0 z-50 overflow-auto"
                        style={{
                            [side]: 0,
                            width,
                            background: 'var(--surface)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ============================================
// ANIMATED LIST
// ============================================

interface AnimatedListProps<T> {
    items: T[];
    renderItem: (item: T, index: number) => ReactNode;
    keyExtractor: (item: T, index: number) => string;
    className?: string;
    itemClassName?: string;
    staggerDelay?: number;
}

export function AnimatedList<T>({
    items,
    renderItem,
    keyExtractor,
    className,
    itemClassName,
    staggerDelay = 0.05,
}: AnimatedListProps<T>) {
    return (
        <StaggeredContainer staggerDelay={staggerDelay} className={className}>
            {items.map((item, index) => (
                <StaggeredItem key={keyExtractor(item, index)} className={itemClassName}>
                    {renderItem(item, index)}
                </StaggeredItem>
            ))}
        </StaggeredContainer>
    );
}

// ============================================
// COLLAPSE TRANSITION
// ============================================

interface CollapseTransitionProps {
    children: ReactNode;
    isOpen: boolean;
}

export function CollapseTransition({ children, isOpen }: CollapseTransitionProps) {
    return (
        <AnimatePresence initial={false}>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                        height: { duration: 0.3, ease: 'easeInOut' },
                        opacity: { duration: 0.2 },
                    }}
                    style={{ overflow: 'hidden' }}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ============================================
// LOADING TRANSITION
// ============================================

interface LoadingTransitionProps {
    isLoading: boolean;
    loadingContent: ReactNode;
    children: ReactNode;
}

export function LoadingTransition({
    isLoading,
    loadingContent,
    children,
}: LoadingTransitionProps) {
    return (
        <AnimatePresence mode="wait">
            {isLoading ? (
                <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={quickTransition}
                >
                    {loadingContent}
                </motion.div>
            ) : (
                <motion.div
                    key="content"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={smoothTransition}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ============================================
// TAB TRANSITION
// ============================================

interface TabTransitionProps {
    children: ReactNode;
    direction?: 'left' | 'right';
    tabKey: string;
}

export function TabTransition({ children, direction = 'left', tabKey }: TabTransitionProps) {
    const variants: Variants = {
        initial: {
            opacity: 0,
            x: direction === 'left' ? -20 : 20,
        },
        animate: {
            opacity: 1,
            x: 0,
        },
        exit: {
            opacity: 0,
            x: direction === 'left' ? 20 : -20,
        },
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={tabKey}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={variants}
                transition={quickTransition}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}

export default PageTransition;
