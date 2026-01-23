-- Migration: Implement all security and data integrity fixes
-- Description: Addresses all findings from the database audit
-- Author: Database Audit Team
-- Date: January 2026

-- ============================================
-- FIX 1: Update share_code to 8 characters
-- ============================================
-- Drop the old trigger and function, recreate with 8-char codes

DROP TRIGGER IF EXISTS trip_share_code_trigger ON trips;
DROP FUNCTION IF EXISTS generate_share_code();

-- Create new function with 8-character codes using cryptographic random
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TRIGGER AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    IF NEW.share_code IS NULL THEN
        LOOP
            -- Generate 8-character alphanumeric code using gen_random_bytes
            new_code := UPPER(ENCODE(gen_random_bytes(6), 'base64'));
            -- Remove non-alphanumeric characters and take first 8
            new_code := SUBSTRING(REGEXP_REPLACE(new_code, '[^A-Z0-9]', '', 'g') FROM 1 FOR 8);

            -- Fallback if not enough characters
            IF LENGTH(new_code) < 8 THEN
                new_code := UPPER(SUBSTRING(MD5(NEW.id::TEXT || NOW()::TEXT || random()::TEXT) FROM 1 FOR 8));
            END IF;

            -- Check for collision
            SELECT EXISTS(SELECT 1 FROM trips WHERE share_code = new_code) INTO code_exists;
            EXIT WHEN NOT code_exists;
        END LOOP;
        NEW.share_code := new_code;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trip_share_code_trigger
    BEFORE INSERT ON trips
    FOR EACH ROW
    EXECUTE FUNCTION generate_share_code();

-- ============================================
-- FIX 2: Change SECURITY DEFINER to SECURITY INVOKER with validation
-- ============================================
DROP FUNCTION IF EXISTS increment_course_usage(UUID);

CREATE OR REPLACE FUNCTION increment_course_usage(p_course_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Validate that the course exists
    IF NOT EXISTS (SELECT 1 FROM course_library WHERE id = p_course_id) THEN
        RAISE EXCEPTION 'Course with ID % not found', p_course_id;
    END IF;

    UPDATE course_library
    SET usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE id = p_course_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- ============================================
-- FIX 3: Add missing updated_at columns and triggers
-- ============================================

-- Add updated_at column to team_members if not exists
ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add updated_at column to hole_results if not exists
ALTER TABLE hole_results
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add updated_at column to photos if not exists
ALTER TABLE photos
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add updated_at column to comments if not exists
ALTER TABLE comments
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add updated_at column to achievements if not exists
ALTER TABLE achievements
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add updated_at column to audit_log if not exists
ALTER TABLE audit_log
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add updated_at column to scoring_events if not exists
ALTER TABLE scoring_events
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create triggers for all tables missing them
CREATE TRIGGER update_team_members_updated_at
    BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hole_results_updated_at
    BEFORE UPDATE ON hole_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photos_updated_at
    BEFORE UPDATE ON photos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_achievements_updated_at
    BEFORE UPDATE ON achievements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audit_log_updated_at
    BEFORE UPDATE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scoring_events_updated_at
    BEFORE UPDATE ON scoring_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FIX 4: Add array length constraints for hole data
-- ============================================

-- tee_sets: hole_handicaps must be exactly 18 elements
ALTER TABLE tee_sets
DROP CONSTRAINT IF EXISTS chk_tee_sets_hole_handicaps_length;

ALTER TABLE tee_sets
ADD CONSTRAINT chk_tee_sets_hole_handicaps_length
CHECK (array_length(hole_handicaps, 1) = 18);

-- tee_sets: hole_pars must be exactly 18 elements when provided
ALTER TABLE tee_sets
DROP CONSTRAINT IF EXISTS chk_tee_sets_hole_pars_length;

ALTER TABLE tee_sets
ADD CONSTRAINT chk_tee_sets_hole_pars_length
CHECK (hole_pars IS NULL OR array_length(hole_pars, 1) = 18);

-- tee_sets: yardages must be exactly 18 elements when provided
ALTER TABLE tee_sets
DROP CONSTRAINT IF EXISTS chk_tee_sets_yardages_length;

ALTER TABLE tee_sets
ADD CONSTRAINT chk_tee_sets_yardages_length
CHECK (yardages IS NULL OR array_length(yardages, 1) = 18);

-- course_library_tee_sets: hole_pars must be exactly 18 elements
ALTER TABLE course_library_tee_sets
DROP CONSTRAINT IF EXISTS chk_course_library_tee_sets_hole_pars_length;

ALTER TABLE course_library_tee_sets
ADD CONSTRAINT chk_course_library_tee_sets_hole_pars_length
CHECK (array_length(hole_pars, 1) = 18);

-- course_library_tee_sets: hole_handicaps must be exactly 18 elements when provided
ALTER TABLE course_library_tee_sets
DROP CONSTRAINT IF EXISTS chk_course_library_tee_sets_hole_handicaps_length;

ALTER TABLE course_library_tee_sets
ADD CONSTRAINT chk_course_library_tee_sets_hole_handicaps_length
CHECK (hole_handicaps IS NULL OR array_length(hole_handicaps, 1) = 18);

-- course_library_tee_sets: hole_yardages must be exactly 18 elements when provided
ALTER TABLE course_library_tee_sets
DROP CONSTRAINT IF EXISTS chk_course_library_tee_sets_hole_yardages_length;

ALTER TABLE course_library_tee_sets
ADD CONSTRAINT chk_course_library_tee_sets_hole_yardages_length
CHECK (hole_yardages IS NULL OR array_length(hole_yardages, 1) = 18);

-- matches: player arrays should have 1-2 players
ALTER TABLE matches
DROP CONSTRAINT IF EXISTS chk_matches_team_a_players_length;

ALTER TABLE matches
ADD CONSTRAINT chk_matches_team_a_players_length
CHECK (array_length(team_a_player_ids, 1) >= 1 AND array_length(team_a_player_ids, 1) <= 2);

ALTER TABLE matches
DROP CONSTRAINT IF EXISTS chk_matches_team_b_players_length;

ALTER TABLE matches
ADD CONSTRAINT chk_matches_team_b_players_length
CHECK (array_length(team_b_player_ids, 1) >= 1 AND array_length(team_b_player_ids, 1) <= 2);

-- ============================================
-- FIX 5: Add DELETE audit triggers
-- ============================================

-- Function to log deletions to audit_log
CREATE OR REPLACE FUNCTION audit_delete_operation()
RETURNS TRIGGER AS $$
DECLARE
    v_trip_id UUID;
    v_entity_type TEXT;
    v_summary TEXT;
BEGIN
    v_entity_type := TG_TABLE_NAME;

    -- Try to get trip_id from the deleted record
    CASE TG_TABLE_NAME
        WHEN 'trips' THEN
            v_trip_id := OLD.id;
            v_summary := 'Trip "' || OLD.name || '" was deleted';
        WHEN 'teams' THEN
            v_trip_id := OLD.trip_id;
            v_summary := 'Team "' || OLD.name || '" was deleted';
        WHEN 'sessions' THEN
            v_trip_id := OLD.trip_id;
            v_summary := 'Session "' || OLD.name || '" was deleted';
        WHEN 'matches' THEN
            SELECT trip_id INTO v_trip_id FROM sessions WHERE id = OLD.session_id;
            v_summary := 'Match #' || OLD.match_order || ' was deleted';
        WHEN 'players' THEN
            -- Players aren't tied to a single trip, use NULL
            v_trip_id := NULL;
            v_summary := 'Player "' || OLD.first_name || ' ' || OLD.last_name || '" was deleted';
        WHEN 'hole_results' THEN
            SELECT s.trip_id INTO v_trip_id
            FROM matches m JOIN sessions s ON m.session_id = s.id
            WHERE m.id = OLD.match_id;
            v_summary := 'Hole ' || OLD.hole_number || ' result was deleted';
        ELSE
            v_trip_id := NULL;
            v_summary := v_entity_type || ' record was deleted';
    END CASE;

    -- Only log if we have a trip_id (skip orphaned records)
    IF v_trip_id IS NOT NULL THEN
        INSERT INTO audit_log (
            trip_id,
            action_type,
            actor_name,
            summary,
            details,
            related_entity_id,
            related_entity_type
        ) VALUES (
            v_trip_id,
            'DELETE',
            COALESCE(current_setting('app.actor_name', true), 'System'),
            v_summary,
            jsonb_build_object('deleted_record', row_to_json(OLD)),
            OLD.id::TEXT,
            v_entity_type
        );
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Create delete audit triggers for key tables
CREATE TRIGGER audit_trips_delete
    BEFORE DELETE ON trips
    FOR EACH ROW EXECUTE FUNCTION audit_delete_operation();

CREATE TRIGGER audit_teams_delete
    BEFORE DELETE ON teams
    FOR EACH ROW EXECUTE FUNCTION audit_delete_operation();

CREATE TRIGGER audit_sessions_delete
    BEFORE DELETE ON sessions
    FOR EACH ROW EXECUTE FUNCTION audit_delete_operation();

CREATE TRIGGER audit_matches_delete
    BEFORE DELETE ON matches
    FOR EACH ROW EXECUTE FUNCTION audit_delete_operation();

CREATE TRIGGER audit_hole_results_delete
    BEFORE DELETE ON hole_results
    FOR EACH ROW EXECUTE FUNCTION audit_delete_operation();

-- ============================================
-- FIX 6: Add composite indexes for common query patterns
-- ============================================

-- Composite index for trip dashboard (sessions by trip + date)
CREATE INDEX IF NOT EXISTS idx_sessions_trip_date
ON sessions(trip_id, scheduled_date);

-- Composite index for match queries (session + status)
CREATE INDEX IF NOT EXISTS idx_matches_session_status
ON matches(session_id, status);

-- Partial index for active matches only
CREATE INDEX IF NOT EXISTS idx_matches_active
ON matches(id, session_id, current_hole)
WHERE status = 'inProgress';

-- Composite index for hole results ordering
CREATE INDEX IF NOT EXISTS idx_hole_results_match_hole
ON hole_results(match_id, hole_number);

-- Index for share code lookups (heavily used)
CREATE INDEX IF NOT EXISTS idx_trips_share_code
ON trips(share_code)
WHERE share_code IS NOT NULL;

-- ============================================
-- ROLLBACK COMMANDS (for reference)
-- ============================================
-- To rollback:
-- DROP TRIGGER IF EXISTS audit_trips_delete ON trips;
-- DROP TRIGGER IF EXISTS audit_teams_delete ON teams;
-- DROP TRIGGER IF EXISTS audit_sessions_delete ON sessions;
-- DROP TRIGGER IF EXISTS audit_matches_delete ON matches;
-- DROP TRIGGER IF EXISTS audit_hole_results_delete ON hole_results;
-- DROP FUNCTION IF EXISTS audit_delete_operation();
-- DROP TRIGGER IF EXISTS update_team_members_updated_at ON team_members;
-- DROP TRIGGER IF EXISTS update_hole_results_updated_at ON hole_results;
-- DROP TRIGGER IF EXISTS update_photos_updated_at ON photos;
-- DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
-- DROP TRIGGER IF EXISTS update_achievements_updated_at ON achievements;
-- DROP TRIGGER IF EXISTS update_audit_log_updated_at ON audit_log;
-- DROP TRIGGER IF EXISTS update_scoring_events_updated_at ON scoring_events;
-- ALTER TABLE tee_sets DROP CONSTRAINT IF EXISTS chk_tee_sets_hole_handicaps_length;
-- ALTER TABLE tee_sets DROP CONSTRAINT IF EXISTS chk_tee_sets_hole_pars_length;
-- ALTER TABLE tee_sets DROP CONSTRAINT IF EXISTS chk_tee_sets_yardages_length;
-- ALTER TABLE course_library_tee_sets DROP CONSTRAINT IF EXISTS chk_course_library_tee_sets_hole_pars_length;
-- ALTER TABLE course_library_tee_sets DROP CONSTRAINT IF EXISTS chk_course_library_tee_sets_hole_handicaps_length;
-- ALTER TABLE course_library_tee_sets DROP CONSTRAINT IF EXISTS chk_course_library_tee_sets_hole_yardages_length;
-- ALTER TABLE matches DROP CONSTRAINT IF EXISTS chk_matches_team_a_players_length;
-- ALTER TABLE matches DROP CONSTRAINT IF EXISTS chk_matches_team_b_players_length;
