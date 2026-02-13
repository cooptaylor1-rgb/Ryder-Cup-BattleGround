/**
 * UI Components barrel export
 *
 * Consolidated, world-class UI components.
 */

// Core primitives
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './Button';
export {
  IconButton,
  type IconButtonProps,
  type IconButtonSize,
  type IconButtonVariant,
} from './IconButton';
export {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  type CardProps,
  type CardVariant,
} from './Card';
export { Input, type InputProps } from './Input';

// Accessibility & Form validation
export {
  FormError,
  FormHint,
  FormErrorSummary,
  LiveRegion,
  type FormErrorProps,
  type FormErrorVariant,
  type FormHintProps,
  type FormErrorSummaryProps,
  type LiveRegionProps,
} from './FormError';

// Feedback & overlays
export { Modal, ConfirmDialog, type ModalProps, type ConfirmDialogProps } from './Modal';
export { OfflineIndicator } from './OfflineIndicator';
export { ToastContainer } from './Toast';
export { UndoToast, useUndoToast } from './UndoToast';
export { Tooltip, type TooltipProps } from './Tooltip';
export {
  ErrorBoundary,
  ErrorFallback,
  MiniErrorFallback,
  ErrorCard,
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
export {
  PageLoadingSkeleton,
  InlineLoadingSkeleton,
  CardLoadingSkeleton,
} from './PageLoadingSkeleton';

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
  // New premium empty states
  NoBetsEmpty,
  NoMessagesEmpty,
  NoPhotosEmpty,
  NoActivityEmpty,
  LoadingEmpty,
} from './EmptyState';

// Navigation components
export {
  Breadcrumb,
  SimpleBreadcrumb,
  type BreadcrumbItem,
  type BreadcrumbProps,
} from './Breadcrumb';

// Legacy alias (still actively used by TournamentList)
export { NoTripsEmpty as NoTournamentsEmpty } from './EmptyState';

// Premium aliases (still actively used by 5 pages — migrate to direct names when convenient)
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
  RyderCupTrophyIllustration,
} from './illustrations';

// Onboarding & Discovery
export { Onboarding, WelcomeBack, FeatureSpotlight } from './Onboarding';

export { WhatsNew, FeatureCard, useWhatsNew } from './WhatsNew';

export { QuickStartWizard } from './QuickStartWizard';

export { LiveMatchBanner, LiveMatchPill } from './LiveMatchBanner';

export { ContinueScoringBanner } from './ContinueScoringBanner';

// Performance & Offline
export { PullToRefresh, usePullToRefresh } from './PullToRefresh';

export { SyncStatus, FloatingSyncStatus } from './SyncStatus';

// ─── Removed: orphan animation/celebration components ─────────────
// Deleted (never imported): ConfettiCannon, VictoryModal,
// AnimatedCounter, ScoreCelebration (ui), MicroInteractions,
// PremiumComponents, Celebration, ShareButton, ConnectionStatus,
// PageTransitions, SuccessConfetti, EmptyStateIllustrations
// ──────────────────────────────────────────────────────────────────

// P0 UX Components
export { YourMatchCard } from './YourMatchCard';
export { CaptainToggle } from './CaptainToggle';

// Phase 4: Polish & Delight
export {
  Skeleton as SkeletonLoader,
  MatchCardSkeleton as MatchCardSkeletonV2,
  ScoreCardSkeleton,
  LeaderboardSkeleton,
  PlayerCardSkeleton,
  StatsSkeleton,
  PhotoGridSkeleton as PhotoGridSkeletonV2,
  ActivityFeedSkeleton,
  PageSkeleton as PageSkeletonV2,
  SkeletonWrapper,
} from './SkeletonLoaders';


// Keyboard Shortcuts
export { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
export { KeyboardShortcutsProvider } from './KeyboardShortcutsProvider';

// Session Management
export { SessionTimeoutWarning } from './SessionTimeoutWarning';

// Format Explainer
export { FormatExplainer } from './FormatExplainer';

// Weather Awareness
export { WeatherBanner } from './WeatherBanner';
export type { DelayStatus } from './WeatherBanner';
