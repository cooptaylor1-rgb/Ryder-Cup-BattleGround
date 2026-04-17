-- Add is_practice_round flag to trips so captains can mark a trip as a
-- casual practice round instead of a cup-style team competition. When true,
-- the app hides the team-vs-team leaderboard and cup framing; sessions,
-- matches, and scoring still work normally.

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS is_practice_round BOOLEAN NOT NULL DEFAULT FALSE;
