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

// Captain Dashboard
export {
  CaptainDashboard,
  type TripSetupStatus,
  type SessionSummary,
  type TeamSummary,
} from './CaptainDashboard';

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
  AnnouncementBanner,
  QuickAnnouncementModal,
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
export { BulkImportModal } from './BulkImportModal';
export { TeeTimeGenerator } from './TeeTimeGenerator';
export { DraftBoard } from './DraftBoard';
export { SmartPairingSuggestions } from './SmartPairingSuggestions';
export { SideBetsTracker } from './SideBetsTracker';
export { SessionWeatherPanel } from './SessionWeatherPanel';
export { CaptainToolkit } from './CaptainToolkit';

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
  DirectMessage,
  type MessageRecipientType,
  type MessageRecipient,
  type QuickMessageTemplate,
  type MessagePlayer,
  type SentMessage,
} from './DirectMessage';

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
