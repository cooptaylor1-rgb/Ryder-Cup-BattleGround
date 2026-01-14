/**
 * UI Components barrel export
 *
 * Consolidated, world-class UI components.
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
export { UndoToast, useUndoToast } from './UndoToast';
export { Tooltip, type TooltipProps } from './Tooltip';
export {
  ErrorBoundary,
  ErrorFallback,
  useErrorHandler,
  withErrorBoundary,
} from './ErrorBoundary';

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
  LiveMatchCardSkeleton,
  AchievementCardSkeleton,
  BetCardSkeleton,
  CommentCardSkeleton,
  PhotoGridSkeleton,
  WeatherWidgetSkeleton,
  DashboardSkeleton,
  PageSkeleton,
} from './Skeleton';

// Empty states (consolidated - using Premium as primary)
export {
  EmptyState,
  EmptyStatePremium,
  NoTripsEmpty,
  NoMatchesEmpty,
  NoSessionsEmpty,
  NoPlayersEmpty,
  NoStandingsEmpty,
  NoCoursesEmpty,
  NoScoresEmpty,
  NoSearchResultsEmpty,
  TournamentCompleteEmpty,
  OfflineEmpty,
  ErrorEmpty,
} from './EmptyState';

// Legacy aliases for backwards compatibility
export { NoTripsEmpty as NoTournamentsEmpty } from './EmptyState';
export { EmptyState as EmptyStateNew } from './EmptyState';
export { NoTripsEmpty as NoTripsEmptyNew } from './EmptyState';
export { NoMatchesEmpty as NoMatchesEmptyNew } from './EmptyState';
export { NoSessionsEmpty as NoSessionsEmptyNew } from './EmptyState';
export { NoPlayersEmpty as NoPlayersEmptyNew } from './EmptyState';
export { NoStandingsEmpty as NoStandingsEmptyNew } from './EmptyState';
export { NoCoursesEmpty as NoCoursesEmptyNew } from './EmptyState';
export { NoScoresEmpty as NoScoresEmptyNew } from './EmptyState';

// Premium aliases for backwards compatibility
export { NoMatchesEmpty as NoMatchesPremiumEmpty } from './EmptyState';
export { NoSessionsEmpty as NoSessionsPremiumEmpty } from './EmptyState';
export { NoPlayersEmpty as NoPlayersPremiumEmpty } from './EmptyState';
export { NoStandingsEmpty as NoStandingsPremiumEmpty } from './EmptyState';
export { NoCoursesEmpty as NoCoursesPremiumEmpty } from './EmptyState';
export { NoScoresEmpty as NoScoresPremiumEmpty } from './EmptyState';

// Golf illustrations
export {
  GolfBallTee,
  TrophyIllustration,
  GolfersIllustration,
  ScorecardIllustration,
  GolfFlagIllustration,
  CalendarIllustration,
  PodiumIllustration,
  GolfSwingIllustration,
  CelebrationIllustration,
} from './illustrations';

// Onboarding & Discovery
export {
  Onboarding,
  WelcomeBack,
  FeatureSpotlight,
} from './Onboarding';

export {
  WhatsNew,
  FeatureCard,
  useWhatsNew,
} from './WhatsNew';

export {
  QuickStartWizard,
} from './QuickStartWizard';

export {
  LiveMatchBanner,
  LiveMatchPill,
} from './LiveMatchBanner';

// Performance & Offline
export {
  PullToRefresh,
  usePullToRefresh,
} from './PullToRefresh';

export {
  SyncStatus,
  FloatingSyncStatus,
} from './SyncStatus';
