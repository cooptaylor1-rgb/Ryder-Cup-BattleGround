import type { HammerAction, HammerGame } from '@/lib/types/sideGames';

import { DEFAULT_HAMMER_CONFIG } from './extendedSideGamesRegistry';

export function processHammerAction(
    game: HammerGame,
    holeNumber: number,
    team: 'team1' | 'team2',
    action: 'hammer' | 'accept' | 'decline'
): { game: HammerGame; holeComplete: boolean; winner?: 'team1' | 'team2' | 'halved' } {
    const config = { ...DEFAULT_HAMMER_CONFIG, startingValue: game.startingValue };

    let currentHole = game.holeResults.find((holeResult) => holeResult.holeNumber === holeNumber);
    if (!currentHole) {
        currentHole = {
            holeNumber,
            hammerActions: [],
            finalValue: game.startingValue,
            winner: 'halved',
            pointsWon: 0,
        };
    }

    const hammerAction: HammerAction = {
        team,
        action,
        valueAfter:
            action === 'hammer'
                ? currentHole.finalValue * config.valueMultiplier
                : currentHole.finalValue,
        timestamp: new Date().toISOString(),
    };

    currentHole.hammerActions.push(hammerAction);

    let holeComplete = false;
    let winner: 'team1' | 'team2' | 'halved' | undefined;

    if (action === 'hammer') {
        currentHole.finalValue *= config.valueMultiplier;

        const hammerCount = currentHole.hammerActions.filter((entry) => entry.action === 'hammer').length;
        if (hammerCount >= game.maxHammers && config.autoAcceptFinal) {
            holeComplete = true;
        }
    } else if (action === 'decline') {
        holeComplete = true;
        winner = team === 'team1' ? 'team2' : 'team1';
        currentHole.winner = winner;
        currentHole.pointsWon = currentHole.finalValue / config.valueMultiplier;
    }

    const newHoleResults = game.holeResults.filter((holeResult) => holeResult.holeNumber !== holeNumber);
    newHoleResults.push(currentHole);
    newHoleResults.sort((left, right) => left.holeNumber - right.holeNumber);

    const newHammerHolder =
        action === 'hammer'
            ? team === 'team1'
                ? 'team2'
                : 'team1'
            : game.hammerHolder;

    return {
        game: {
            ...game,
            holeResults: newHoleResults,
            currentValue: currentHole.finalValue,
            hammerHolder: newHammerHolder,
            status: 'active',
        },
        holeComplete,
        winner,
    };
}

export function completeHammerHole(
    game: HammerGame,
    holeNumber: number,
    team1Score: number,
    team2Score: number
): HammerGame {
    const currentHole = game.holeResults.find((holeResult) => holeResult.holeNumber === holeNumber);
    if (!currentHole) {
        throw new Error(`No hammer result found for hole ${holeNumber}`);
    }

    if (currentHole.winner !== 'halved') {
        return game;
    }

    let winner: 'team1' | 'team2' | 'halved';
    if (team1Score < team2Score) {
        winner = 'team1';
    } else if (team2Score < team1Score) {
        winner = 'team2';
    } else {
        winner = 'halved';
    }

    currentHole.winner = winner;
    currentHole.pointsWon = winner === 'halved' ? 0 : currentHole.finalValue;

    let newRunningScore = game.runningScore;
    if (winner === 'team1') {
        newRunningScore += currentHole.pointsWon;
    } else if (winner === 'team2') {
        newRunningScore -= currentHole.pointsWon;
    }

    const newHoleResults = game.holeResults.map((holeResult) =>
        holeResult.holeNumber === holeNumber ? currentHole : holeResult
    );

    return {
        ...game,
        holeResults: newHoleResults,
        runningScore: newRunningScore,
        currentValue: game.startingValue,
    };
}
