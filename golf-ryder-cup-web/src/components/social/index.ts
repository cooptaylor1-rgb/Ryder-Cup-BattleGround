/**
 * Social Components - Barrel Export
 */

// Photo & Media
export { PhotoGallery, PhotoStrip } from './PhotoGallery';

// Comments & Banter
export { TrashTalkFeed, MatchResultAnnouncement } from './TrashTalkFeed';

// Sharing
export { MatchResultCard, StandingsShareCard } from './ShareCard';

// Trip Summary
export { TripRecap } from './TripRecap';

// Activity Feed
export {
  ActivityFeed,
  CompactActivity,
  type ActivityType,
  type ActivityItem,
} from './ActivityFeed';

// Player Profiles
export {
  PlayerProfileCard,
  type PlayerProfile,
  type PlayerStats,
  type PlayerBadge,
} from './PlayerProfileCard';

// Notifications
export {
  NotificationProvider,
  NotificationBell,
  NotificationCenter,
  useNotifications,
  type Notification,
  type NotificationType,
} from './EngagementNotifications';

// Leaderboard
export {
  Leaderboard,
  type LeaderboardEntry,
  type SortCriteria,
} from './Leaderboard';

// Reactions
export {
  ReactionPicker,
  QuickReactionBar,
  ReactionSummary,
  type Reaction,
  type ReactionData,
} from './ReactionPicker';

// Photo Capture
export { PhotoCapture, type PhotoContext, type CapturedPhoto, type MomentType } from './photo/PhotoCapture';

// Moments
export { MomentCard, type Moment, type MomentReaction, type MomentComment } from './moments/MomentCard';

// Memories
export { TripMemories, type TripMemory, type TripStats, type TripHighlight, type TripData } from './memories/TripMemories';

// Live Reactions
export {
  LiveReactionStream,
  ScoreCelebration,
  type LiveReaction,
  type LiveReactionType,
} from './live/LiveReactionStream';
