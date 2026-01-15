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
  MiniErrorFallback,
  ErrorCard,
  useErrorHandler,
  withErrorBoundary,
} from './ErrorBoundary';

// Celebration & success
export {
  SuccessOverlay,
  VictoryCelebration,
  PointScored,
  AchievementBadge,
} from './Celebration';

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
  // New premium empty states
  NoBetsEmpty,
  NoMessagesEmpty,
  NoPhotosEmpty,
  NoActivityEmpty,
  LoadingEmpty,
} from './EmptyState';

// Navigation components
export { Breadcrumb, SimpleBreadcrumb, type BreadcrumbItem, type BreadcrumbProps } from './Breadcrumb';

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

// Celebrations & Delight
export {
  ConfettiProvider,
  ConfettiBurst,
  CelebrationParticles,
  GoldShimmer,
  useConfetti,
  type ConfettiTheme,
  type BurstPattern,
} from './ConfettiCannon';

export {
  VictoryModal,
  VictoryToast,
  type MatchResult,
  type TournamentResult,
} from './VictoryModal';

export {
  AnimatedCounter,
  RollingDigits,
  ScoreTicker,
  StatCounter,
  Countdown,
} from './AnimatedCounter';

export {
  CelebrationProvider,
  ScoreBadge,
  MatchStatusIndicator,
  HoleResult,
  useCelebration,
  type CelebrationType,
  type CelebrationEvent,
} from './ScoreCelebration';

// Micro Interactions
export {
  Pressable,
  AnimatedReveal,
  StaggeredList,
  ShimmerSkeleton,
  SuccessCheckmark,
  ErrorShake,
  BounceIndicator,
  PulseDot,
  TypingIndicator,
  ProgressRing,
  SwipeHint,
  LongPressProgress,
} from './MicroInteractions';

// Premium Components (v3.0)
export {
  PremiumLiveMatchBanner,
  HoleProgressStrip,
  PremiumProgressBar,
  AnimatedScore,
  PremiumStandingsCard,
  PremiumMatchCard,
  PageTransition,
  PremiumSectionHeader,
  PremiumEmptyState,
} from './PremiumComponents';

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

export {
  PageTransition as PageTransitionV2,
  TransitionPresence,
  StaggeredContainer,
  StaggeredItem,
  ModalTransition,
  SheetTransition,
  SlideOver,
  AnimatedList,
  CollapseTransition,
  LoadingTransition,
  TabTransition,
  fadeVariants,
  slideUpVariants,
  slideDownVariants,
  slideLeftVariants,
  slideRightVariants,
  scaleUpVariants,
  popInVariants,
  springTransition,
  smoothTransition,
  quickTransition,
  type TransitionType,
} from './PageTransitions';

export {
  SuccessConfetti,
  ConfettiCannon,
  GolfCelebration,
  useConfetti as useConfettiV2,
} from './SuccessConfetti';

export {
  EmptyState as EmptyStateIllustrated,
  type EmptyStateType,
} from './EmptyStateIllustrations';
