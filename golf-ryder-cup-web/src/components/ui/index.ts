/**
 * UI Components barrel export
 */

// Core primitives
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './Button';
export { IconButton, type IconButtonProps, type IconButtonSize, type IconButtonVariant } from './IconButton';
export { Card, CardHeader, CardContent, CardFooter, type CardProps, type CardVariant } from './Card';
export { Input, type InputProps } from './Input';

// Feedback & overlays
export { Modal, ConfirmDialog, type ModalProps, type ConfirmDialogProps } from './Modal';
export { OfflineIndicator } from './OfflineIndicator';
export { ToastContainer } from './Toast';
export { Tooltip, type TooltipProps } from './Tooltip';

// Navigation & organization
export { Tabs, TabList, TabTrigger, TabContent, type TabsProps } from './Tabs';
export { SectionHeader, type SectionHeaderProps } from './SectionHeader';

// Display
export { Badge, StatusBadge, type BadgeProps, type BadgeVariant } from './Badge';
export { ScoreButton } from './ScoreButton';
export { HoleIndicator, HoleStrip } from './HoleIndicator';
export { MatchCard } from './MatchCard';
export { StandingsCard } from './StandingsCard';

// Loading states
export {
    Skeleton,
    SkeletonText,
    MatchCardSkeleton,
    StandingsCardSkeleton,
    PlayerListSkeleton,
    SessionCardSkeleton,
} from './Skeleton';

// Empty states (legacy)
export {
    EmptyState,
    NoTripsEmpty,
    NoMatchesEmpty,
    NoSessionsEmpty,
    NoPlayersEmpty,
    NoStandingsEmpty,
    NoCoursesEmpty,
} from './EmptyState';

// Empty states (new design)
export {
    EmptyStateNew,
    NoTripsEmptyNew,
    NoMatchesEmptyNew,
    NoSessionsEmptyNew,
    NoPlayersEmptyNew,
    NoStandingsEmptyNew,
    NoCoursesEmptyNew,
    NoScoresEmptyNew,
} from './EmptyStateNew';

