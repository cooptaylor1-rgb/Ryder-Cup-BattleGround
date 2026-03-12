import type { VegasGame, VegasHoleResult } from '@/lib/types/sideGames';

export function calculateVegasNumber(
    score1: number,
    score2: number,
    shouldFlip: boolean
): number {
    const low = Math.min(score1, score2);
    const high = Math.max(score1, score2);

    if (shouldFlip) {
        return high * 10 + low;
    }

    return low * 10 + high;
}

export function recordVegasHoleResult(
    game: VegasGame,
    holeNumber: number,
    team1Scores: [number, number],
    team2Scores: [number, number]
): VegasGame {
    const team1HasBad = team1Scores.some((score) => score >= game.flipThreshold);
    const team2HasBad = team2Scores.some((score) => score >= game.flipThreshold);

    const team1Flipped = game.flipEnabled && team1HasBad;
    const team2Flipped = game.flipEnabled && team2HasBad;

    const team1Vegas = calculateVegasNumber(team1Scores[0], team1Scores[1], team1Flipped);
    const team2Vegas = calculateVegasNumber(team2Scores[0], team2Scores[1], team2Flipped);

    const pointDiff = team2Vegas - team1Vegas;
    const newRunningTotal = game.runningScore + pointDiff;

    const holeResult: VegasHoleResult = {
        holeNumber,
        team1Scores,
        team2Scores,
        team1Vegas,
        team2Vegas,
        team1Flipped,
        team2Flipped,
        pointDiff,
        runningTotal: newRunningTotal,
    };

    return {
        ...game,
        holeResults: [...game.holeResults, holeResult],
        runningScore: newRunningTotal,
        status: 'active',
    };
}
