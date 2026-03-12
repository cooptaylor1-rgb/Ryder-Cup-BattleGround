/**
 * Tournament Engine Service
 *
 * Public facade for tournament standings, fairness, and format helpers.
 */

export {
    calculateMagicNumber,
    calculatePlayerLeaderboard,
    calculatePlayerRecord,
    calculateSessionStandings,
    calculateTeamStandings,
} from './tournament-engine/tournamentEngineStandings';
export { calculateFairnessScore } from './tournament-engine/tournamentEngineFairness';
export {
    calculateFormatHandicap,
    getExtendedFormatConfig,
    getSessionConfig,
    validateSessionLineup,
} from './tournament-engine/tournamentEngineFormats';

import {
    calculateMagicNumber,
    calculatePlayerLeaderboard,
    calculatePlayerRecord,
    calculateSessionStandings,
    calculateTeamStandings,
} from './tournament-engine/tournamentEngineStandings';
import { calculateFairnessScore } from './tournament-engine/tournamentEngineFairness';
import {
    calculateFormatHandicap,
    getExtendedFormatConfig,
    getSessionConfig,
    validateSessionLineup,
} from './tournament-engine/tournamentEngineFormats';

export const TournamentEngine = {
    calculateTeamStandings,
    calculateSessionStandings,
    calculateMagicNumber,
    calculatePlayerRecord,
    calculatePlayerLeaderboard,
    calculateFairnessScore,
    getSessionConfig,
    getExtendedFormatConfig,
    calculateFormatHandicap,
    validateSessionLineup,
};

export default TournamentEngine;
