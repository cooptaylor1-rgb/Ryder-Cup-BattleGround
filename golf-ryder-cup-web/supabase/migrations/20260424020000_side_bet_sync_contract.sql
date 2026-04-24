-- Add first-class columns for the app's SideBet model while keeping
-- the legacy notes JSON readable by older clients.

ALTER TABLE public.side_bets
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS participant_ids uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS per_hole numeric(10, 2),
  ADD COLUMN IF NOT EXISTS results jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS nassau_team_a uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS nassau_team_b uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS nassau_results jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE OR REPLACE FUNCTION pg_temp.try_parse_side_bet_notes(raw text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  IF raw IS NULL OR btrim(raw) = '' THEN
    RETURN '{}'::jsonb;
  END IF;

  RETURN raw::jsonb;
EXCEPTION WHEN others THEN
  RETURN '{}'::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.try_parse_timestamptz(raw text)
RETURNS timestamptz
LANGUAGE plpgsql
AS $$
BEGIN
  IF raw IS NULL OR btrim(raw) = '' THEN
    RETURN NULL;
  END IF;

  RETURN raw::timestamptz;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

WITH parsed AS (
  SELECT
    id,
    pg_temp.try_parse_side_bet_notes(notes) AS data
  FROM public.side_bets
)
UPDATE public.side_bets AS sb
SET
  description = COALESCE(sb.description, NULLIF(parsed.data ->> 'description', '')),
  status = CASE
    WHEN parsed.data ->> 'status' IN ('active', 'completed', 'pending')
      THEN parsed.data ->> 'status'
    ELSE sb.status
  END,
  session_id = COALESCE(
    sb.session_id,
    CASE
      WHEN parsed.data ->> 'sessionId' ~* '^[0-9a-f-]{36}$'
        THEN (parsed.data ->> 'sessionId')::uuid
      ELSE NULL
    END
  ),
  participant_ids = CASE
    WHEN sb.participant_ids <> '{}'::uuid[] THEN sb.participant_ids
    WHEN jsonb_typeof(parsed.data -> 'participantIds') = 'array' THEN
      ARRAY(
        SELECT value::uuid
        FROM jsonb_array_elements_text(parsed.data -> 'participantIds') AS elem(value)
        WHERE value ~* '^[0-9a-f-]{36}$'
      )
    ELSE sb.participant_ids
  END,
  per_hole = COALESCE(
    sb.per_hole,
    CASE
      WHEN jsonb_typeof(parsed.data -> 'perHole') = 'number'
        THEN (parsed.data ->> 'perHole')::numeric
      ELSE NULL
    END
  ),
  results = CASE
    WHEN jsonb_typeof(parsed.data -> 'results') = 'array' THEN parsed.data -> 'results'
    ELSE sb.results
  END,
  nassau_team_a = CASE
    WHEN sb.nassau_team_a <> '{}'::uuid[] THEN sb.nassau_team_a
    WHEN jsonb_typeof(parsed.data -> 'nassauTeamA') = 'array' THEN
      ARRAY(
        SELECT value::uuid
        FROM jsonb_array_elements_text(parsed.data -> 'nassauTeamA') AS elem(value)
        WHERE value ~* '^[0-9a-f-]{36}$'
      )
    ELSE sb.nassau_team_a
  END,
  nassau_team_b = CASE
    WHEN sb.nassau_team_b <> '{}'::uuid[] THEN sb.nassau_team_b
    WHEN jsonb_typeof(parsed.data -> 'nassauTeamB') = 'array' THEN
      ARRAY(
        SELECT value::uuid
        FROM jsonb_array_elements_text(parsed.data -> 'nassauTeamB') AS elem(value)
        WHERE value ~* '^[0-9a-f-]{36}$'
      )
    ELSE sb.nassau_team_b
  END,
  nassau_results = CASE
    WHEN jsonb_typeof(parsed.data -> 'nassauResults') = 'object'
      THEN parsed.data -> 'nassauResults'
    ELSE sb.nassau_results
  END,
  completed_at = COALESCE(
    sb.completed_at,
    pg_temp.try_parse_timestamptz(parsed.data ->> 'completedAt')
  )
FROM parsed
WHERE parsed.id = sb.id;

UPDATE public.side_bets
SET
  status = CASE
    WHEN status IN ('active', 'completed', 'pending') THEN status
    ELSE 'active'
  END,
  participant_ids = COALESCE(participant_ids, '{}'::uuid[]),
  results = CASE
    WHEN results IS NOT NULL AND jsonb_typeof(results) = 'array' THEN results
    ELSE '[]'::jsonb
  END,
  nassau_team_a = COALESCE(nassau_team_a, '{}'::uuid[]),
  nassau_team_b = COALESCE(nassau_team_b, '{}'::uuid[]),
  nassau_results = CASE
    WHEN nassau_results IS NOT NULL AND jsonb_typeof(nassau_results) = 'object' THEN nassau_results
    ELSE '{}'::jsonb
  END;

ALTER TABLE public.side_bets
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN participant_ids SET DEFAULT '{}'::uuid[],
  ALTER COLUMN participant_ids SET NOT NULL,
  ALTER COLUMN results SET DEFAULT '[]'::jsonb,
  ALTER COLUMN results SET NOT NULL,
  ALTER COLUMN nassau_team_a SET DEFAULT '{}'::uuid[],
  ALTER COLUMN nassau_team_a SET NOT NULL,
  ALTER COLUMN nassau_team_b SET DEFAULT '{}'::uuid[],
  ALTER COLUMN nassau_team_b SET NOT NULL,
  ALTER COLUMN nassau_results SET DEFAULT '{}'::jsonb,
  ALTER COLUMN nassau_results SET NOT NULL;

ALTER TABLE public.side_bets
  DROP CONSTRAINT IF EXISTS side_bets_status_check;

ALTER TABLE public.side_bets
  ADD CONSTRAINT side_bets_status_check
  CHECK (status IN ('active', 'completed', 'pending'));

ALTER TABLE public.side_bets
  DROP CONSTRAINT IF EXISTS side_bets_results_is_array;

ALTER TABLE public.side_bets
  ADD CONSTRAINT side_bets_results_is_array
  CHECK (jsonb_typeof(results) = 'array');

ALTER TABLE public.side_bets
  DROP CONSTRAINT IF EXISTS side_bets_nassau_results_is_object;

ALTER TABLE public.side_bets
  ADD CONSTRAINT side_bets_nassau_results_is_object
  CHECK (jsonb_typeof(nassau_results) = 'object');

CREATE INDEX IF NOT EXISTS idx_side_bets_trip_session
  ON public.side_bets(trip_id, session_id)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_side_bets_trip_status
  ON public.side_bets(trip_id, status);

CREATE INDEX IF NOT EXISTS idx_side_bets_participant_ids
  ON public.side_bets USING gin(participant_ids);
