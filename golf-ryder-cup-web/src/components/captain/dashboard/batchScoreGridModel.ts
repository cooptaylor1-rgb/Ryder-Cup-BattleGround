import type {
  BatchCellLocation,
  BatchCellTeam,
  BatchMatch,
  BatchMatchScores,
  BatchScoreEntry,
  BatchScores,
} from './batchScoreGridTypes';

export function getCellId(matchId: string, hole: number, team: BatchCellTeam): string {
  return `${matchId}-${hole}-${team}`;
}

export function parseCellId(cellId: string): BatchCellLocation | null {
  const parts = cellId.split('-');
  if (parts.length < 3) return null;

  const team = parts.pop() as BatchCellTeam;
  const hole = parseInt(parts.pop() || '', 10);
  const matchId = parts.join('-');

  if (team !== 'A' && team !== 'B') return null;
  if (Number.isNaN(hole)) return null;

  return { matchId, hole, team };
}

export function validateScore(score: number | null): { valid: boolean; message?: string } {
  if (score === null) return { valid: true };
  if (score < 1) return { valid: false, message: 'Score must be at least 1' };
  if (score > 15) return { valid: false, message: 'Score seems too high' };
  return { valid: true };
}

export function getDisplayedHoles(
  totalHoles: number,
  frontNineOnly: boolean,
  backNineOnly: boolean
): number[] {
  if (frontNineOnly) return Array.from({ length: 9 }, (_, index) => index + 1);
  if (backNineOnly) return Array.from({ length: 9 }, (_, index) => index + 10);
  return Array.from({ length: totalHoles }, (_, index) => index + 1);
}

export function createInitialScores(
  matches: BatchMatch[],
  existingScores: BatchScores = {},
  holes: number[]
): BatchScores {
  const initial: BatchScores = {};

  for (const match of matches) {
    const existingMatchScores = existingScores[match.id] || {};
    const clonedMatchScores: BatchMatchScores = {};

    for (const [holeKey, holeScore] of Object.entries(existingMatchScores)) {
      clonedMatchScores[Number(holeKey)] = {
        teamA: holeScore.teamA,
        teamB: holeScore.teamB,
      };
    }

    for (const hole of holes) {
      if (!clonedMatchScores[hole]) {
        clonedMatchScores[hole] = { teamA: null, teamB: null };
      }
    }

    initial[match.id] = clonedMatchScores;
  }

  return initial;
}

export function buildDirtyEntries(
  dirtyScores: Set<string>,
  scores: BatchScores,
  errorScores: Set<string>
): BatchScoreEntry[] {
  const entries: BatchScoreEntry[] = [];

  dirtyScores.forEach((cellId) => {
    const parsed = parseCellId(cellId);
    if (!parsed) return;

    const { matchId, hole, team } = parsed;
    const score = scores[matchId]?.[hole]?.[team === 'A' ? 'teamA' : 'teamB'] ?? null;

    entries.push({
      matchId,
      hole,
      teamAScore: team === 'A' ? score : scores[matchId]?.[hole]?.teamA ?? null,
      teamBScore: team === 'B' ? score : scores[matchId]?.[hole]?.teamB ?? null,
      isDirty: true,
      hasError: errorScores.has(cellId),
    });
  });

  return entries;
}

export function getRowSummary(scores: BatchMatchScores, holes: number[]) {
  let teamATotal = 0;
  let teamBTotal = 0;
  let holesPlayed = 0;

  for (const hole of holes) {
    const holeScore = scores[hole];
    if (holeScore?.teamA != null && holeScore?.teamB != null) {
      teamATotal += holeScore.teamA;
      teamBTotal += holeScore.teamB;
      holesPlayed += 1;
    }
  }

  const diff = teamBTotal - teamATotal;

  return {
    teamATotal,
    teamBTotal,
    holesPlayed,
    diff,
    display: diff > 0 ? `+${diff}` : diff < 0 ? String(diff) : 'AS',
  };
}

export function getNavigatedCellId(
  cellId: string,
  key: string,
  matches: BatchMatch[],
  holes: number[]
): string | null {
  const parsed = parseCellId(cellId);
  if (!parsed) return null;

  const { matchId, hole, team } = parsed;
  const matchIndex = matches.findIndex((match) => match.id === matchId);
  const holeIndex = holes.indexOf(hole);

  let newMatchId = matchId;
  let newHole = hole;
  let newTeam = team;

  switch (key) {
    case 'ArrowRight':
    case 'Tab':
      if (team === 'A') {
        newTeam = 'B';
      } else {
        newTeam = 'A';
        if (holeIndex < holes.length - 1) {
          newHole = holes[holeIndex + 1];
        } else if (matchIndex < matches.length - 1) {
          newMatchId = matches[matchIndex + 1].id;
          newHole = holes[0];
        }
      }
      break;

    case 'ArrowLeft':
      if (team === 'B') {
        newTeam = 'A';
      } else {
        newTeam = 'B';
        if (holeIndex > 0) {
          newHole = holes[holeIndex - 1];
        } else if (matchIndex > 0) {
          newMatchId = matches[matchIndex - 1].id;
          newHole = holes[holes.length - 1];
        }
      }
      break;

    case 'ArrowDown':
      if (team === 'A') {
        newTeam = 'B';
      } else if (matchIndex < matches.length - 1) {
        newMatchId = matches[matchIndex + 1].id;
        newTeam = 'A';
      }
      break;

    case 'ArrowUp':
      if (team === 'B') {
        newTeam = 'A';
      } else if (matchIndex > 0) {
        newMatchId = matches[matchIndex - 1].id;
        newTeam = 'B';
      }
      break;

    case 'Enter':
      if (matchIndex < matches.length - 1) {
        newMatchId = matches[matchIndex + 1].id;
      }
      break;

    default:
      return null;
  }

  return getCellId(newMatchId, newHole, newTeam);
}
