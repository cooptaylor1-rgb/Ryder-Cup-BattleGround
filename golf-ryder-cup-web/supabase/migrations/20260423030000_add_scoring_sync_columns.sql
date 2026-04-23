-- Add columns the scoring client already computes but was silently
-- dropping on sync. Match-day data-loss risk:
--   * fourball per-player strokes (team_a/b_player_scores) were never
--     written to Supabase, only aggregate team strokes
--   * audit trail (edit_history, last_edited_by/at, edit_reason) was
--     only kept locally, so captains couldn't reconstruct disputed
--     hole scores after a device swap or cache clear
--   * matches.version was modelled client-side for optimistic
--     concurrency but had no server-side storage, so two devices
--     scoring the same match could silently overwrite each other
--
-- All columns are nullable / defaulted so older clients that don't
-- populate them keep working.

ALTER TABLE public.hole_results
  ADD COLUMN IF NOT EXISTS team_a_player_scores jsonb,
  ADD COLUMN IF NOT EXISTS team_b_player_scores jsonb,
  ADD COLUMN IF NOT EXISTS edit_history jsonb,
  ADD COLUMN IF NOT EXISTS last_edited_by uuid,
  ADD COLUMN IF NOT EXISTS last_edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS edit_reason text;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
