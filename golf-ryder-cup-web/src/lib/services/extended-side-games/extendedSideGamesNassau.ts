import type { NassauEnhanced, NassauPress } from '@/lib/types/sideGames';

export function recordNassauHoleResult(
    game: NassauEnhanced,
    holeNumber: number,
    team1Score: number,
    team2Score: number
): NassauEnhanced {
    const nine = holeNumber <= 9 ? 'front' : 'back';
    const nineResult = nine === 'front' ? { ...game.frontNine } : { ...game.backNine };

    if (team1Score < team2Score) {
        nineResult.team1Holes++;
    } else if (team2Score < team1Score) {
        nineResult.team2Holes++;
    } else {
        nineResult.halvesCount++;
    }

    const newPresses: NassauPress[] = [];
    if (game.autoPressEnabled) {
        const team1Down = nineResult.team2Holes - nineResult.team1Holes;
        const team2Down = nineResult.team1Holes - nineResult.team2Holes;
        const existingNinePresses = game.presses.filter((press) => press.nine === nine);

        if (
            team1Down >= game.autoPressThreshold &&
            existingNinePresses.filter((press) => press.pressedByTeam === 'team1').length < game.maxPresses
        ) {
            const pressCount = existingNinePresses.filter((press) => press.pressedByTeam === 'team1').length;
            if (team1Down >= game.autoPressThreshold * (pressCount + 1)) {
                newPresses.push({
                    id: crypto.randomUUID(),
                    nine,
                    startHole: holeNumber + 1,
                    pressedByTeam: 'team1',
                    value: game.baseValue,
                    isAuto: true,
                });
            }
        }

        if (
            team2Down >= game.autoPressThreshold &&
            existingNinePresses.filter((press) => press.pressedByTeam === 'team2').length < game.maxPresses
        ) {
            const pressCount = existingNinePresses.filter((press) => press.pressedByTeam === 'team2').length;
            if (team2Down >= game.autoPressThreshold * (pressCount + 1)) {
                newPresses.push({
                    id: crypto.randomUUID(),
                    nine,
                    startHole: holeNumber + 1,
                    pressedByTeam: 'team2',
                    value: game.baseValue,
                    isAuto: true,
                });
            }
        }
    }

    const newOverall = { ...game.overall };
    if (team1Score < team2Score) {
        newOverall.team1Total++;
    } else if (team2Score < team1Score) {
        newOverall.team2Total++;
    }

    if (holeNumber === 9 || holeNumber === 18) {
        if (nineResult.team1Holes > nineResult.team2Holes) {
            nineResult.winner = 'team1';
        } else if (nineResult.team2Holes > nineResult.team1Holes) {
            nineResult.winner = 'team2';
        } else {
            nineResult.winner = 'push';
        }
    }

    if (holeNumber === 18) {
        if (newOverall.team1Total > newOverall.team2Total) {
            newOverall.winner = 'team1';
        } else if (newOverall.team2Total > newOverall.team1Total) {
            newOverall.winner = 'team2';
        } else {
            newOverall.winner = 'push';
        }
    }

    return {
        ...game,
        frontNine: nine === 'front' ? nineResult : game.frontNine,
        backNine: nine === 'back' ? nineResult : game.backNine,
        overall: newOverall,
        presses: [...game.presses, ...newPresses],
        status: holeNumber === 18 ? 'completed' : 'active',
    };
}

export function addManualPress(
    game: NassauEnhanced,
    nine: 'front' | 'back' | 'overall',
    team: 'team1' | 'team2',
    startHole: number,
    value?: number
): NassauEnhanced {
    const existingPresses = game.presses.filter(
        (press) => press.nine === nine && press.pressedByTeam === team
    );

    if (existingPresses.length >= game.maxPresses) {
        throw new Error(`Maximum presses (${game.maxPresses}) already reached for this nine`);
    }

    const newPress: NassauPress = {
        id: crypto.randomUUID(),
        nine,
        startHole,
        pressedByTeam: team,
        value: value ?? game.baseValue,
        isAuto: false,
    };

    return {
        ...game,
        presses: [...game.presses, newPress],
    };
}
