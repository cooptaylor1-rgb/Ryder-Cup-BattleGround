-- Foundation for new match formats (Pinehurst, Greensomes, Scramble variants,
-- Sixes 6-6-6, Cha-Cha-Cha, 1-2-3, Best 2 of 4).
--
-- The original CHECK constraint locked sessions.session_type to the three
-- traditional Ryder Cup formats. We replace it with a wider allow-list that
-- matches the values now permitted by the SessionType TypeScript union.
--
-- The application UI still gates which formats are *selectable* (see
-- SUPPORTED_SESSION_TYPES in newLineupConfig.ts). This migration only ensures
-- the database accepts the new values once each format's score-entry path is
-- wired up in subsequent PRs.

ALTER TABLE sessions
  DROP CONSTRAINT IF EXISTS sessions_session_type_check;

ALTER TABLE sessions
  ADD CONSTRAINT sessions_session_type_check
  CHECK (session_type IN (
    -- Originally supported (still the only formats reachable from the UI today)
    'foursomes',
    'fourball',
    'singles',
    -- Match-play partner variants
    'pinehurst',
    'greensomes',
    -- Team scrambles
    'scramble',
    'scramble-2',
    'scramble-3',
    'scramble-4',
    'texas-scramble',
    'shamble',
    -- Multi-player aggregates
    'best-2-of-4',
    -- Hole-range / rotating formats
    'six-six-six',
    'cha-cha-cha',
    'one-two-three'
  ));
