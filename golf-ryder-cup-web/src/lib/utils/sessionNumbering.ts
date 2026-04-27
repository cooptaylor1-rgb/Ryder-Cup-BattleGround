export interface SessionNumberLike {
  sessionNumber?: number | null;
}

export function getFirstOpenSessionNumber(sessions: SessionNumberLike[]): number {
  const takenSessionNumbers = new Set(
    sessions
      .map((session) => session.sessionNumber)
      .filter((sessionNumber): sessionNumber is number =>
        typeof sessionNumber === 'number' && Number.isInteger(sessionNumber) && sessionNumber > 0
      )
  );

  let candidate = 1;
  while (takenSessionNumbers.has(candidate)) {
    candidate += 1;
  }

  return candidate;
}
