/**
 * Player Onboarding Components
 *
 * A complete onboarding experience for players invited to join a golf trip.
 * These components guide invited players through profile setup, availability,
 * and team integration.
 */

// Main Wizard (combines all steps)
export { PlayerOnboardingWizard } from './PlayerOnboardingWizard';
export type {
    OnboardingStep,
    PlayerOnboardingData,
    PlayerOnboardingWizardProps
} from './PlayerOnboardingWizard';

// Phase 1: Welcome & Quick Setup
export { TripWelcomeCard } from './TripWelcomeCard';
export type { TripPreview } from './TripWelcomeCard';

export { QuickProfileMode } from './QuickProfileMode';
export type { QuickProfileData } from './QuickProfileMode';

// Phase 2: Golf Profile
export { GHINLookup } from './GHINLookup';
export type { GHINResult } from './GHINLookup';

export { PlayingStyleSurvey } from './PlayingStyleSurvey';
export type { PlayingStyle } from './PlayingStyleSurvey';

export { AvailabilityCalendar } from './AvailabilityCalendar';
export type { TripSession, AvailabilityStatus } from './AvailabilityCalendar';

// Phase 3: Personalization
export { ProfilePhotoUpload } from './ProfilePhotoUpload';

export { GolfSuperlatives } from './GolfSuperlatives';
export type { Superlative, SuperlativeAnswer } from './GolfSuperlatives';

export { SideBetOptIn } from './SideBetOptIn';
export type { SideBet, SideBetPreference } from './SideBetOptIn';

// Phase 4: Logistics & Completion
export { TravelLodgingInfo } from './TravelLodgingInfo';
export type { TravelInfo } from './TravelLodgingInfo';

export { ProfileCompletionReward } from './ProfileCompletionReward';
export type { CompletionData } from './ProfileCompletionReward';
