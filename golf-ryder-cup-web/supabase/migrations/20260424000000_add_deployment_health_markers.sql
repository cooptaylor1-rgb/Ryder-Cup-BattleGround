-- Deployment health markers let /api/health prove that the critical
-- production migration set was applied before a Railway deploy is
-- considered healthy.

CREATE TABLE IF NOT EXISTS public.deployment_migration_markers (
  id text PRIMARY KEY,
  description text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deployment_migration_markers ENABLE ROW LEVEL SECURITY;

INSERT INTO public.deployment_migration_markers (id, description)
VALUES
  ('20260423000000_add_match_mode', 'matches.mode for practice versus cup scoring'),
  ('20260423010000_add_practice_scores', 'practice score persistence'),
  ('20260423020000_add_banter_posts', 'banter post cloud persistence'),
  ('20260423030000_add_scoring_sync_columns', 'score sync audit and match version columns'),
  ('20260423040000_drop_unused_photos_and_comments', 'drop unused photo/comment tables'),
  ('20260424000000_add_deployment_health_markers', 'strict deployment health marker table')
ON CONFLICT (id) DO UPDATE
SET
  description = EXCLUDED.description,
  applied_at = public.deployment_migration_markers.applied_at;
