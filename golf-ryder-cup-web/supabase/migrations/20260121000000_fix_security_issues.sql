-- Migration: Fix Security Definer Views and Enable RLS
-- This migration addresses Supabase linter security issues:
-- 1. Recreates views without SECURITY DEFINER (uses SECURITY INVOKER instead)
-- 2. Enables RLS on all public tables
-- 3. Adds permissive policies (app uses share codes for access control)

-- ============================================
-- FIX SECURITY DEFINER VIEWS
-- ============================================
-- Recreate views with SECURITY INVOKER (the safe default)
-- This ensures views respect the querying user's permissions

-- Drop existing views
DROP VIEW IF EXISTS live_standings;
DROP VIEW IF EXISTS active_matches;

-- Recreate live_standings view with SECURITY INVOKER
CREATE VIEW live_standings
WITH (security_invoker = true)
AS
SELECT
    t.id as trip_id,
    t.name as trip_name,
    teams.id as team_id,
    teams.name as team_name,
    teams.color,
    COALESCE(SUM(
        CASE
            WHEN teams.color = 'usa' AND m.result LIKE 'teamAWin%' THEN s.points_per_match
            WHEN teams.color = 'europe' AND m.result LIKE 'teamBWin%' THEN s.points_per_match
            WHEN m.result = 'halved' THEN s.points_per_match / 2
            ELSE 0
        END
    ), 0) as points
FROM trips t
JOIN teams ON teams.trip_id = t.id
LEFT JOIN sessions s ON s.trip_id = t.id
LEFT JOIN matches m ON m.session_id = s.id AND m.status = 'completed'
GROUP BY t.id, t.name, teams.id, teams.name, teams.color;

-- Recreate active_matches view with SECURITY INVOKER
CREATE VIEW active_matches
WITH (security_invoker = true)
AS
SELECT
    m.*,
    s.trip_id,
    s.name as session_name,
    s.session_type
FROM matches m
JOIN sessions s ON m.session_id = s.id
WHERE m.status = 'inProgress';

-- ============================================
-- ENABLE RLS ON ALL PUBLIC TABLES
-- ============================================

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tee_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE hole_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE side_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================
-- This app uses share codes for access control rather than Supabase Auth.
-- These policies allow public access while RLS is enabled.
-- Application-level access control is enforced via trip share codes.

-- TRIPS policies
CREATE POLICY "trips_select_all" ON trips FOR SELECT USING (true);
CREATE POLICY "trips_insert_all" ON trips FOR INSERT WITH CHECK (true);
CREATE POLICY "trips_update_all" ON trips FOR UPDATE USING (true);
CREATE POLICY "trips_delete_all" ON trips FOR DELETE USING (true);

-- TEAMS policies
CREATE POLICY "teams_select_all" ON teams FOR SELECT USING (true);
CREATE POLICY "teams_insert_all" ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "teams_update_all" ON teams FOR UPDATE USING (true);
CREATE POLICY "teams_delete_all" ON teams FOR DELETE USING (true);

-- TEAM_MEMBERS policies
CREATE POLICY "team_members_select_all" ON team_members FOR SELECT USING (true);
CREATE POLICY "team_members_insert_all" ON team_members FOR INSERT WITH CHECK (true);
CREATE POLICY "team_members_update_all" ON team_members FOR UPDATE USING (true);
CREATE POLICY "team_members_delete_all" ON team_members FOR DELETE USING (true);

-- PLAYERS policies
CREATE POLICY "players_select_all" ON players FOR SELECT USING (true);
CREATE POLICY "players_insert_all" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "players_update_all" ON players FOR UPDATE USING (true);
CREATE POLICY "players_delete_all" ON players FOR DELETE USING (true);

-- SESSIONS policies
CREATE POLICY "sessions_select_all" ON sessions FOR SELECT USING (true);
CREATE POLICY "sessions_insert_all" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "sessions_update_all" ON sessions FOR UPDATE USING (true);
CREATE POLICY "sessions_delete_all" ON sessions FOR DELETE USING (true);

-- COURSES policies
CREATE POLICY "courses_select_all" ON courses FOR SELECT USING (true);
CREATE POLICY "courses_insert_all" ON courses FOR INSERT WITH CHECK (true);
CREATE POLICY "courses_update_all" ON courses FOR UPDATE USING (true);
CREATE POLICY "courses_delete_all" ON courses FOR DELETE USING (true);

-- TEE_SETS policies
CREATE POLICY "tee_sets_select_all" ON tee_sets FOR SELECT USING (true);
CREATE POLICY "tee_sets_insert_all" ON tee_sets FOR INSERT WITH CHECK (true);
CREATE POLICY "tee_sets_update_all" ON tee_sets FOR UPDATE USING (true);
CREATE POLICY "tee_sets_delete_all" ON tee_sets FOR DELETE USING (true);

-- MATCHES policies
CREATE POLICY "matches_select_all" ON matches FOR SELECT USING (true);
CREATE POLICY "matches_insert_all" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "matches_update_all" ON matches FOR UPDATE USING (true);
CREATE POLICY "matches_delete_all" ON matches FOR DELETE USING (true);

-- HOLE_RESULTS policies
CREATE POLICY "hole_results_select_all" ON hole_results FOR SELECT USING (true);
CREATE POLICY "hole_results_insert_all" ON hole_results FOR INSERT WITH CHECK (true);
CREATE POLICY "hole_results_update_all" ON hole_results FOR UPDATE USING (true);
CREATE POLICY "hole_results_delete_all" ON hole_results FOR DELETE USING (true);

-- PHOTOS policies
CREATE POLICY "photos_select_all" ON photos FOR SELECT USING (true);
CREATE POLICY "photos_insert_all" ON photos FOR INSERT WITH CHECK (true);
CREATE POLICY "photos_update_all" ON photos FOR UPDATE USING (true);
CREATE POLICY "photos_delete_all" ON photos FOR DELETE USING (true);

-- COMMENTS policies
CREATE POLICY "comments_select_all" ON comments FOR SELECT USING (true);
CREATE POLICY "comments_insert_all" ON comments FOR INSERT WITH CHECK (true);
CREATE POLICY "comments_update_all" ON comments FOR UPDATE USING (true);
CREATE POLICY "comments_delete_all" ON comments FOR DELETE USING (true);

-- SIDE_BETS policies
CREATE POLICY "side_bets_select_all" ON side_bets FOR SELECT USING (true);
CREATE POLICY "side_bets_insert_all" ON side_bets FOR INSERT WITH CHECK (true);
CREATE POLICY "side_bets_update_all" ON side_bets FOR UPDATE USING (true);
CREATE POLICY "side_bets_delete_all" ON side_bets FOR DELETE USING (true);

-- ACHIEVEMENTS policies
CREATE POLICY "achievements_select_all" ON achievements FOR SELECT USING (true);
CREATE POLICY "achievements_insert_all" ON achievements FOR INSERT WITH CHECK (true);
CREATE POLICY "achievements_update_all" ON achievements FOR UPDATE USING (true);
CREATE POLICY "achievements_delete_all" ON achievements FOR DELETE USING (true);

-- AUDIT_LOG policies
CREATE POLICY "audit_log_select_all" ON audit_log FOR SELECT USING (true);
CREATE POLICY "audit_log_insert_all" ON audit_log FOR INSERT WITH CHECK (true);
CREATE POLICY "audit_log_update_all" ON audit_log FOR UPDATE USING (true);
CREATE POLICY "audit_log_delete_all" ON audit_log FOR DELETE USING (true);
