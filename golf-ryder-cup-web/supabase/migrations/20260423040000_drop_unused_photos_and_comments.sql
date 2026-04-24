-- The photos and comments tables were modelled in schema.sql but
-- never had a client writer (no Supabase upsert, no Dexie writer,
-- no UI upload path). They were always empty in production. The
-- only reader was a recap "top photos" tab that has also been
-- removed along with its Dexie tables in Dexie schema v15. Drop
-- them so future scans don't keep surfacing phantom "orphaned"
-- tables and so the pull path stops including two dead fetches.
--
-- CASCADE handles any RLS policy / trigger / FK auto-dependencies
-- (there are none referencing these tables inward, but CASCADE
-- protects against leftover subscriber functions on older installs).

DROP TABLE IF EXISTS public.photos CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
