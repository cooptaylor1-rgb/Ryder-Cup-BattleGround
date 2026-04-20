-- Add covering indexes for foreign keys flagged by the Supabase performance
-- advisor. Without these, FK lookups (and ON DELETE/UPDATE cascades) do full
-- scans as tables grow.
--
-- Applied to production via Supabase MCP on 2026-04-20.

CREATE INDEX IF NOT EXISTS idx_comments_player_id
  ON public.comments(player_id);

CREATE INDEX IF NOT EXISTS idx_hole_results_scored_by
  ON public.hole_results(scored_by);

CREATE INDEX IF NOT EXISTS idx_matches_course_id
  ON public.matches(course_id);

CREATE INDEX IF NOT EXISTS idx_matches_tee_set_id
  ON public.matches(tee_set_id);

CREATE INDEX IF NOT EXISTS idx_photos_uploaded_by
  ON public.photos(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_side_bets_winner_player_id
  ON public.side_bets(winner_player_id);
