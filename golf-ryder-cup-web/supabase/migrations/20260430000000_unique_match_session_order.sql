-- Prevent duplicate "Group N" cards on the Live Net Board.
--
-- Race that produced the bug: a captain double-taps Publish in the
-- Lineup Builder. saveLineup runs twice concurrently — both calls
-- query Dexie for an existing match at (session_id, match_order),
-- both find none (the first call's write hasn't committed), and
-- both INSERT. Since the matches table had no UNIQUE constraint on
-- (session_id, match_order), both rows landed in the cloud and the
-- Live Net Board (which sorts by match_order, no dedupe) rendered
-- the same foursome twice.
--
-- The client-side fix serializes saveLineup per session via an
-- in-flight Promise map. This migration is the cloud-side guard so
-- a different code path, a multi-device race, or a sync queue retry
-- can't create the same duplicate again.

-- 1. Clean up any existing duplicates so the unique index can be
--    created. Keep the earliest by created_at per (session_id,
--    match_order) — that one is also the one whose id was queued
--    for sync first, so it's the canonical row. Restrict to
--    'scheduled' rows so a mid-round match (with hole_results
--    attached) is never silently deleted out from under scoring.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY session_id, match_order
           ORDER BY created_at ASC
         ) AS rn
  FROM matches
  WHERE status = 'scheduled'
)
DELETE FROM matches
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2. Partial unique index excluding 'cancelled' rows. A captain who
--    cancels match #2 and then creates a fresh match #2 should not
--    collide on the constraint with the cancelled tombstone — those
--    are intentionally retained for audit and don't render on the
--    Live Net Board.
CREATE UNIQUE INDEX IF NOT EXISTS matches_session_match_order_unique
  ON matches (session_id, match_order)
  WHERE status <> 'cancelled';
