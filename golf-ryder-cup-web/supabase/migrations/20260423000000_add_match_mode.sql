-- Add a "mode" discriminator to matches so a practice-round match can
-- live next to a regular cup match in the same table. Default is
-- 'ryderCup' for every existing row; practice matches are created with
-- 'practice' and are excluded from cup standings (the app-side filter
-- already skips sessions flagged isPracticeSession; this column lets
-- us also skip individual matches if a mixed session ever shows up).

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'ryderCup';

-- Loosen the column to a CHECK so future modes (scramble, skins-only,
-- etc.) don't require a migration — keep it permissive rather than an
-- enum. Existing values are all 'ryderCup' after the default backfill.
ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS matches_mode_check;

ALTER TABLE matches
  ADD CONSTRAINT matches_mode_check
  CHECK (mode IN ('ryderCup', 'practice'));
