-- Add session-level default course + tee set. Captains set these once
-- in Session Settings; matches created via the lineup builder inherit
-- them. ON DELETE SET NULL so deleting a course doesn't block the
-- session row — the captain can re-pick.
--
-- Applied to production via Supabase MCP on 2026-04-21.

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS default_course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_tee_set_id UUID REFERENCES public.tee_sets(id) ON DELETE SET NULL;

-- Cover the new FK columns so session listing queries don't do a
-- sequential scan on course/tee deletes (the SET NULL triggers a join).
CREATE INDEX IF NOT EXISTS idx_sessions_default_course_id
  ON public.sessions(default_course_id);

CREATE INDEX IF NOT EXISTS idx_sessions_default_tee_set_id
  ON public.sessions(default_tee_set_id);
