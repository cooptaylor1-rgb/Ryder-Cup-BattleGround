/**
 * Captain Dashboard Components — Phase 2: Captain Empowerment
 *
 * Barrel exports for captain dashboard module:
 * - LiveMatchMonitor: Real-time match monitoring cards
 * - PointsCalculator: What-if scenario calculations
 * - AlertCenter: Centralized notification hub
 * - OverrideModal: Score correction with audit trail
 * - BatchScoreGrid: Spreadsheet-style bulk entry
 */

// Live Match Monitoring
export {
    LiveMatchMonitor,
    type LiveMatchData,
    type SessionOverview,
} from './LiveMatchMonitor';

// Points Calculator
export {
    PointsCalculator,
    type MatchOutcome,
    type ProjectedMatch,
} from './PointsCalculator';

// Alert Center
export {
    AlertCenter,
    type CaptainAlert,
    type AlertPriority,
    type AlertCategory,
    type AlertStatus,
} from './AlertCenter';

// Override Modal
export {
    OverrideModal,
    type OverrideReason,
    type AuditEntry,
    type MatchScore,
} from './OverrideModal';

// Batch Score Grid
export {
    BatchScoreGrid,
    type BatchMatch,
    type BatchScoreEntry,
} from './BatchScoreGrid';
