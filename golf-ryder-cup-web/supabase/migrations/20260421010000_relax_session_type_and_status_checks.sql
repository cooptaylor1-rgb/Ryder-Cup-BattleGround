-- Two CHECK constraints on `sessions` rejected values the app has been
-- generating for months, producing 400 Bad Request on every session
-- upsert for the affected rows. Both existed in the
-- 20260414000000 migration file (session_type) and in application
-- types (status) but were never applied to production.
--
-- session_type: broaden from the original three Ryder Cup formats to
-- the full SessionType union in src/lib/types. Matches the repo
-- migration 20260414000000_relax_session_type_constraint.sql exactly,
-- which the Supabase migration tracker had no record of having run.
--
-- status: add 'paused' so the pause/resume flow in
-- src/lib/services/sessionPauseService can actually persist to the
-- cloud. Without this, pausing a session fired 400s until the status
-- reverted, hiding the state from other devices.
--
-- Applied to production via Supabase MCP on 2026-04-21.

ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_session_type_check;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_session_type_check
  CHECK (session_type IN (
    'foursomes',
    'fourball',
    'singles',
    'pinehurst',
    'greensomes',
    'scramble',
    'scramble-2',
    'scramble-3',
    'scramble-4',
    'texas-scramble',
    'shamble',
    'best-2-of-4',
    'six-six-six',
    'cha-cha-cha',
    'one-two-three'
  ));

ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_status_check;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_status_check
  CHECK (status IN ('scheduled', 'inProgress', 'paused', 'completed'));
