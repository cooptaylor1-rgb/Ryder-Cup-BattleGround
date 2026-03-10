/**
 * Captain Components - Barrel Export
 *
 * Components for trip captains/organizers to manage:
 * - Trip setup and configuration
 * - Player roster and team assignment
 * - Match scheduling and lineups
 * - Player invitations
 * - Announcements and communication
 */

// Lineup Builder
export {
  LineupBuilder,
  type Player,
  type MatchSlot,
  type SessionConfig,
} from './LineupBuilder';

// Fairness Scoring
export {
  FairnessCard,
  useFairness,
  calculateFairnessScore,
  calculateHandicapBalance,
  calculateExperienceBalance,
  calculatePlayTimeBalance,
  calculateCombinedHandicap,
  calculateHandicapDiff,
  getFairnessBreakdown,
  generateOptimalPairings,
  suggestSwaps,
  DEFAULT_FAIRNESS_CONFIG,
  type FairnessScore,
  type FairnessBreakdown,
  type FairnessConfig,
  type MatchPairing,
  type SuggestedPairing,
} from './FairnessScoring';

// Announcement System
export {
  AnnouncementComposer,
  AnnouncementHistory,
  type Announcement,
  type AnnouncementPriority,
  type AnnouncementCategory,
  type AnnouncementTemplate,
} from './AnnouncementSystem';

// Invitation Manager
export {
  InvitationManager,
  QRCodeCard,
  type Invitation,
  type InvitationStatus,
  type TripInviteInfo,
} from './InvitationManager';

// Captain Toolkit Components
export { PreFlightChecklist } from './PreFlightChecklist';
export { DraftBoard } from './DraftBoard';

// Pre-Round Captain Tools
export {
  QuickPlayerSwap,
  PlayerSwapModal,
  type SwapPlayer,
  type SwapMatch,
  type PlayerSwap,
} from './QuickPlayerSwap';

export {
  AttendanceCheckIn,
  type AttendanceStatus,
  type AttendeePlayer,
  type AttendanceStats,
} from './AttendanceCheckIn';

export {
  MatchCardGenerator,
  type MatchCardPlayer,
  type MatchCardData,
} from './MatchCardGenerator';

export {
  GoTimeCountdown,
  type CountdownSession,
  type CountdownAlert,
} from './GoTimeCountdown';

export {
  CartAssignmentManager,
  type CartPlayer,
  type Cart,
} from './CartAssignmentManager';

export {
  EmergencyContacts,
  type ContactPlayer,
  type VenueContact,
} from './EmergencyContacts';

export {
  FormatRulesReference,
  type MatchFormat,
  type FormatRule,
  type FAQ,
  type LocalRule,
} from './FormatRulesReference';

export {
  PaceSpacing,
  type PaceGroup,
  type PaceSettings,
} from './PaceSpacing';

export {
  CourseSetupConfirmation,
  type StartType,
  type TeeBoxColor,
  type HoleSetup,
  type CourseSetupItem,
} from './CourseSetupConfirmation';

// Captain Dashboard v2
export {
  LiveMatchMonitor,
  type LiveMatchData,
  type SessionOverview,
} from './dashboard';
export {
  PointsCalculator,
  type MatchOutcome,
  type ProjectedMatch,
} from './dashboard';
export {
  AlertCenter,
  type CaptainAlert,
  type AlertPriority,
  type AlertCategory,
  type AlertStatus,
} from './dashboard';
export {
  OverrideModal,
  type OverrideReason,
  type AuditEntry,
  type MatchScore as OverrideMatchScore,
} from './dashboard';
export {
  BatchScoreGrid,
  type BatchMatch,
  type BatchScoreEntry,
} from './dashboard';

// Audit Trail UI
export {
  AuditBadge,
  InlineAuditIndicator,
  AuditHistoryList,
  type AuditInfo,
} from './audit';
