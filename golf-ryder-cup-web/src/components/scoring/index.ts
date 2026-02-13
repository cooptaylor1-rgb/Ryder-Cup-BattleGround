/**
 * Scoring Components - Barrel Export
 *
 * Components for match play scoring:
 * - Press bet tracking
 * - Handicap stroke indicators
 * - Score displays
 * - Gross/Net score visualization
 * - Stroke alerts
 */

export { PressTracker, type Press, type PressTrackerProps } from './PressTracker';

export {
  HandicapStrokeIndicator,
  StrokeBadge,
  type HandicapStrokeIndicatorProps,
} from './HandicapStrokeIndicator';

export {
  GrossNetScoreDisplay,
  ScorecardRow,
  ScoreLegend,
  type GrossNetScoreDisplayProps,
  type ScorecardRowProps,
} from './GrossNetScoreDisplay';

export {
  StrokeAlertBanner,
  CompactStrokeBadge,
  StrokeHolesMiniMap,
  type StrokeAlertBannerProps,
  type CompactStrokeBadgeProps,
  type StrokeHolesMiniMapProps,
} from './StrokeAlertBanner';

export { MatchScorecard, type MatchScorecardProps, type PlayerScore } from './MatchScorecard';

export { StablefordScorecard } from './StablefordScorecard';

// Phase 1: Core Flow Excellence Components
export { SwipeScorePanel } from './SwipeScorePanel';

export { HoleMiniMap, HoleMiniMapInline } from './HoleMiniMap';

export { ScoreCelebration, ScoreToast } from './ScoreCelebration';

export { QuickScoreFABv2 } from './QuickScoreFABv2';

export { HoleScoreDisplay, InlineGrossNetScore } from './HoleScoreDisplay';

export { StrokeScoreEntry } from './StrokeScoreEntry';

export { FourballScoreEntry } from './FourballScoreEntry';

export { OneHandedScoringPanel } from './OneHandedScoringPanel';
