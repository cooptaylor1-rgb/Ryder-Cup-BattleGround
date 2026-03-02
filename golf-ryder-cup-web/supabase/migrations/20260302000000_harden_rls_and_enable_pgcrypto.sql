-- Phase 1 hardening: require authenticated role for core app table policies
-- and ensure pgcrypto is available for share-code generation.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'trips',
    'teams',
    'team_members',
    'players',
    'sessions',
    'courses',
    'tee_sets',
    'matches',
    'hole_results',
    'photos',
    'comments',
    'side_bets',
    'achievements',
    'audit_log'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_select_all" ON %I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert_all" ON %I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update_all" ON %I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_delete_all" ON %I;', tbl, tbl);

    EXECUTE format(
      'CREATE POLICY "%s_select_all" ON %I FOR SELECT USING (auth.role() = ''authenticated'');',
      tbl,
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_insert_all" ON %I FOR INSERT WITH CHECK (auth.role() = ''authenticated'');',
      tbl,
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_update_all" ON %I FOR UPDATE USING (auth.role() = ''authenticated'');',
      tbl,
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "%s_delete_all" ON %I FOR DELETE USING (auth.role() = ''authenticated'');',
      tbl,
      tbl
    );
  END LOOP;
END;
$$;
