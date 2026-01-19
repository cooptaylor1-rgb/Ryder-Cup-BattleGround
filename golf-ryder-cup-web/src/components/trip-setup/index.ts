// Trip Setup Components - Exceptional flexibility for trip creation
// Phase 1: Core flexibility
export { SessionBuilder, type SessionConfig, type SessionType, type TimeSlot } from './SessionBuilder';
export { PlayerCountSelector } from './PlayerCountSelector';
export { FormatSelector } from './FormatSelector';

// Phase 2: Golf-specific settings
export { CourseSelection, type CourseInfo, type TeeBox } from './CourseSelection';
export { HandicapRules, DEFAULT_HANDICAP_SETTINGS, type HandicapSettings } from './HandicapRules';

// Phase 3: Competition customization
export { PointSystem, DEFAULT_POINT_CONFIG, type PointConfig, type SessionPointOverride } from './PointSystem';
export { SideBetPresets, type SideBetConfig } from './SideBetPresets';
export { ScoringFormatOptions, DEFAULT_SCORING_SETTINGS, type ScoringSettings, type ScoringFormat, type WinCondition } from './ScoringFormatOptions';

// Phase 4: Polish & finish
export { TeamColorPicker, DEFAULT_TEAM_COLORS, type TeamColors } from './TeamColorPicker';
export { TeeTimePreferences, DEFAULT_TEE_TIME_SETTINGS, type TeeTimeSettings } from './TeeTimePreferences';
export { PlayerRosterImport, type PlayerInfo } from './PlayerRosterImport';

// Enhanced Wizard
export { EnhancedTripWizard, type TripSetupData } from './EnhancedTripWizard';
// Template Selection
export { TripTemplatePicker } from './TripTemplatePicker';
