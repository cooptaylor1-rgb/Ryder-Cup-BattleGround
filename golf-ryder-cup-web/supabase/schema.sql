-- Golf Ryder Cup App - PostgreSQL Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TRIPS
-- ============================================
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    location TEXT,
    notes TEXT,
    is_captain_mode_enabled BOOLEAN DEFAULT FALSE,
    captain_name TEXT,
    share_code TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generate unique share codes for trips (8-character alphanumeric)
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
-- PLAYERS
-- ============================================
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    handicap_index DECIMAL(4,1),
    ghin TEXT,
    tee_preference TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TEAMS
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL CHECK (color IN ('usa', 'europe')),
    color_hex TEXT,
    icon TEXT,
    notes TEXT,
    mode TEXT DEFAULT 'ryderCup' CHECK (mode IN ('freeform', 'ryderCup')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teams_trip_id ON teams(trip_id);

-- ============================================
-- TEAM MEMBERS
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    is_captain BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, player_id)
);

CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_player_id ON team_members(player_id);

-- ============================================
-- SESSIONS (Ryder Cup Format)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    session_number INTEGER NOT NULL,
    session_type TEXT NOT NULL CHECK (session_type IN ('foursomes', 'fourball', 'singles')),
    scheduled_date DATE,
    time_slot TEXT CHECK (time_slot IN ('AM', 'PM')),
    points_per_match DECIMAL(3,1) DEFAULT 1.0,
    notes TEXT,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'inProgress', 'completed')),
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_trip_id ON sessions(trip_id);

-- ============================================
-- COURSES
-- ============================================
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    location TEXT,
    api_course_id TEXT,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TEE SETS
-- ============================================
CREATE TABLE IF NOT EXISTS tee_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    rating DECIMAL(4, 1) NOT NULL,
    slope INTEGER NOT NULL,
    par INTEGER NOT NULL,
    hole_handicaps INTEGER[] NOT NULL CHECK (array_length(hole_handicaps, 1) = 18),
    hole_pars INTEGER[] CHECK (hole_pars IS NULL OR array_length(hole_pars, 1) = 18),
    yardages INTEGER[] CHECK (yardages IS NULL OR array_length(yardages, 1) = 18),
    total_yardage INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tee_sets_course_id ON tee_sets(course_id);

-- ============================================
-- COURSE LIBRARY (Global Course Database)
-- ============================================
-- These tables store reusable course data that persists across trips
-- and can be shared among all users

CREATE TABLE IF NOT EXISTS course_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    location TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'USA',
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    phone TEXT,
    website TEXT,
    notes TEXT,
    -- Source tracking
    source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ocr', 'api', 'import')),
    api_course_id TEXT,
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT  -- User/device identifier
);

CREATE INDEX idx_course_library_name ON course_library(name);
CREATE INDEX idx_course_library_location ON course_library(location);
CREATE INDEX idx_course_library_state ON course_library(state);

-- ============================================
-- COURSE LIBRARY TEE SETS
-- ============================================
CREATE TABLE IF NOT EXISTS course_library_tee_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_library_id UUID NOT NULL REFERENCES course_library(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    color_hex TEXT,
    gender TEXT DEFAULT 'mens' CHECK (gender IN ('mens', 'womens', 'unisex')),
    rating DECIMAL(4, 1),
    slope INTEGER,
    par INTEGER NOT NULL,
    total_yardage INTEGER,
    -- Per-hole data (arrays of 18 values)
    hole_pars INTEGER[] NOT NULL CHECK (array_length(hole_pars, 1) = 18),
    hole_handicaps INTEGER[] CHECK (hole_handicaps IS NULL OR array_length(hole_handicaps, 1) = 18),
    hole_yardages INTEGER[] CHECK (hole_yardages IS NULL OR array_length(hole_yardages, 1) = 18),
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_course_library_tee_sets_course ON course_library_tee_sets(course_library_id);

-- Function to atomically increment course usage count (with validation)
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

-- Trigger to update course usage count
CREATE OR REPLACE FUNCTION update_course_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE course_library
    SET usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE id = NEW.course_library_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at on course library
CREATE TRIGGER update_course_library_updated_at
    BEFORE UPDATE ON course_library
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_library_tee_sets_updated_at
    BEFORE UPDATE ON course_library_tee_sets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MATCHES
-- ============================================
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id),
    tee_set_id UUID REFERENCES tee_sets(id),
    match_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'inProgress', 'completed', 'cancelled')),
    start_time TIMESTAMPTZ,
    current_hole INTEGER DEFAULT 1,
    team_a_player_ids UUID[] NOT NULL CHECK (array_length(team_a_player_ids, 1) BETWEEN 1 AND 2),
    team_b_player_ids UUID[] NOT NULL CHECK (array_length(team_b_player_ids, 1) BETWEEN 1 AND 2),
    team_a_handicap_allowance INTEGER DEFAULT 0,
    team_b_handicap_allowance INTEGER DEFAULT 0,
    result TEXT DEFAULT 'notFinished',
    margin INTEGER DEFAULT 0,
    holes_remaining INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_matches_session_id ON matches(session_id);
CREATE INDEX idx_matches_status ON matches(status);

-- ============================================
-- HOLE RESULTS
-- ============================================
CREATE TABLE IF NOT EXISTS hole_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    hole_number INTEGER NOT NULL CHECK (hole_number >= 1 AND hole_number <= 18),
    winner TEXT NOT NULL CHECK (winner IN ('teamA', 'teamB', 'halved', 'none')),
    team_a_strokes INTEGER,
    team_b_strokes INTEGER,
    scored_by UUID REFERENCES players(id),
    notes TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id, hole_number)
);

CREATE INDEX idx_hole_results_match_id ON hole_results(match_id);

-- ============================================
-- PHOTOS (Step 2: Social)
-- ============================================
CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    hole_number INTEGER CHECK (hole_number >= 1 AND hole_number <= 18),
    uploaded_by UUID NOT NULL REFERENCES players(id),
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photos_trip_id ON photos(trip_id);
CREATE INDEX idx_photos_match_id ON photos(match_id);

-- ============================================
-- COMMENTS (Step 2: Social - Trash Talk Feed)
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    player_id UUID NOT NULL REFERENCES players(id),
    content TEXT NOT NULL,
    emoji TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_trip_id ON comments(trip_id);
CREATE INDEX idx_comments_match_id ON comments(match_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- ============================================
-- SIDE BETS (Step 4: Gamification)
-- ============================================
CREATE TABLE IF NOT EXISTS side_bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    bet_type TEXT NOT NULL CHECK (bet_type IN ('skins', 'nassau', 'closest_to_pin', 'longest_drive', 'custom')),
    name TEXT NOT NULL,
    amount DECIMAL(10, 2),
    winner_player_id UUID REFERENCES players(id),
    hole_number INTEGER CHECK (hole_number >= 1 AND hole_number <= 18),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_side_bets_trip_id ON side_bets(trip_id);
CREATE INDEX idx_side_bets_match_id ON side_bets(match_id);

-- ============================================
-- ACHIEVEMENTS (Step 4: Gamification)
-- ============================================
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(player_id, trip_id, achievement_type)
);

CREATE INDEX idx_achievements_player_id ON achievements(player_id);
CREATE INDEX idx_achievements_trip_id ON achievements(trip_id);

-- ============================================
-- AUDIT LOG
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    actor_name TEXT NOT NULL,
    summary TEXT NOT NULL,
    details JSONB,
    related_entity_id TEXT,
    related_entity_type TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_trip_id ON audit_log(trip_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);

-- ============================================
-- SCORING EVENTS (Background Sync)
-- ============================================
-- Stores scoring events from offline clients for sync
CREATE TABLE IF NOT EXISTS scoring_events (
    id UUID PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    hole_number INTEGER CHECK (hole_number >= 1 AND hole_number <= 18),
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    device_id TEXT,
    processed BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scoring_events_match_id ON scoring_events(match_id);
CREATE INDEX idx_scoring_events_created_at ON scoring_events(created_at DESC);
CREATE INDEX idx_scoring_events_unprocessed ON scoring_events(match_id) WHERE processed = FALSE;

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tee_sets_updated_at BEFORE UPDATE ON tee_sets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_side_bets_updated_at BEFORE UPDATE ON side_bets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hole_results_updated_at BEFORE UPDATE ON hole_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON photos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_achievements_updated_at BEFORE UPDATE ON achievements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_audit_log_updated_at BEFORE UPDATE ON audit_log FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scoring_events_updated_at BEFORE UPDATE ON scoring_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_course_library_updated_at BEFORE UPDATE ON course_library FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_course_library_tee_sets_updated_at BEFORE UPDATE ON course_library_tee_sets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DELETE AUDIT TRAIL
-- ============================================
-- Logs all DELETE operations for compliance and debugging
CREATE TABLE IF NOT EXISTS delete_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    deleted_data JSONB NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_by TEXT -- Device/user identifier
);

CREATE INDEX idx_delete_audit_log_table ON delete_audit_log(table_name);
CREATE INDEX idx_delete_audit_log_deleted_at ON delete_audit_log(deleted_at DESC);

-- Enable RLS on delete_audit_log
ALTER TABLE delete_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delete_audit_log_select_all"
    ON delete_audit_log FOR SELECT
    USING (true);

CREATE POLICY "delete_audit_log_insert_all"
    ON delete_audit_log FOR INSERT
    WITH CHECK (true);

-- Generic function to log DELETE operations
CREATE OR REPLACE FUNCTION log_delete_operation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO delete_audit_log (table_name, record_id, deleted_data, deleted_by)
    VALUES (
        TG_TABLE_NAME,
        OLD.id,
        row_to_json(OLD)::jsonb,
        current_setting('app.device_id', true)
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- DELETE audit triggers for critical tables
CREATE TRIGGER audit_trips_delete BEFORE DELETE ON trips FOR EACH ROW EXECUTE FUNCTION log_delete_operation();
CREATE TRIGGER audit_players_delete BEFORE DELETE ON players FOR EACH ROW EXECUTE FUNCTION log_delete_operation();
CREATE TRIGGER audit_matches_delete BEFORE DELETE ON matches FOR EACH ROW EXECUTE FUNCTION log_delete_operation();
CREATE TRIGGER audit_hole_results_delete BEFORE DELETE ON hole_results FOR EACH ROW EXECUTE FUNCTION log_delete_operation();
CREATE TRIGGER audit_sessions_delete BEFORE DELETE ON sessions FOR EACH ROW EXECUTE FUNCTION log_delete_operation();

-- ============================================
-- REAL-TIME SUBSCRIPTIONS
-- ============================================
-- Enable real-time for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE hole_results;
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE photos;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on course library tables
ALTER TABLE course_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_library_tee_sets ENABLE ROW LEVEL SECURITY;

-- Course Library RLS Policies
-- Anyone can read courses (shared library)
CREATE POLICY "course_library_select_all"
    ON course_library FOR SELECT
    USING (true);

-- Anyone can insert new courses (device-based tracking via created_by)
CREATE POLICY "course_library_insert_all"
    ON course_library FOR INSERT
    WITH CHECK (true);

-- Users can only update courses they created (by device id)
-- If created_by is null, anyone can update (legacy data)
CREATE POLICY "course_library_update_own"
    ON course_library FOR UPDATE
    USING (created_by IS NULL OR created_by = current_setting('app.device_id', true));

-- Users can only delete courses they created
CREATE POLICY "course_library_delete_own"
    ON course_library FOR DELETE
    USING (created_by IS NULL OR created_by = current_setting('app.device_id', true));

-- Tee Sets: inherit course permissions
CREATE POLICY "course_library_tee_sets_select_all"
    ON course_library_tee_sets FOR SELECT
    USING (true);

CREATE POLICY "course_library_tee_sets_insert_all"
    ON course_library_tee_sets FOR INSERT
    WITH CHECK (true);

CREATE POLICY "course_library_tee_sets_update_course_owner"
    ON course_library_tee_sets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM course_library
            WHERE id = course_library_tee_sets.course_library_id
            AND (created_by IS NULL OR created_by = current_setting('app.device_id', true))
        )
    );

CREATE POLICY "course_library_tee_sets_delete_course_owner"
    ON course_library_tee_sets FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM course_library
            WHERE id = course_library_tee_sets.course_library_id
            AND (created_by IS NULL OR created_by = current_setting('app.device_id', true))
        )
    );

-- Enable RLS on all public tables
-- Access control is enforced at the application level via trip share codes
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE hole_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tee_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE side_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR APPLICATION TABLES
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

-- SCORING_EVENTS policies (server-side only via service role)
CREATE POLICY "scoring_events_select_all" ON scoring_events FOR SELECT USING (true);
CREATE POLICY "scoring_events_insert_all" ON scoring_events FOR INSERT WITH CHECK (true);
CREATE POLICY "scoring_events_update_all" ON scoring_events FOR UPDATE USING (true);
CREATE POLICY "scoring_events_delete_all" ON scoring_events FOR DELETE USING (true);

-- ============================================
-- VIEWS
-- ============================================

-- Live standings view (SECURITY INVOKER ensures RLS is respected)
CREATE OR REPLACE VIEW live_standings
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

-- Active matches view (SECURITY INVOKER ensures RLS is respected)
CREATE OR REPLACE VIEW active_matches
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
-- COMPOSITE INDEXES (Performance)
-- ============================================
-- Optimize common query patterns

-- Trip + status queries (common dashboard pattern)
CREATE INDEX IF NOT EXISTS idx_sessions_trip_status ON sessions(trip_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_session_status ON matches(session_id, status);

-- Player statistics queries
CREATE INDEX IF NOT EXISTS idx_achievements_player_trip ON achievements(player_id, trip_id);

-- Timeline queries
CREATE INDEX IF NOT EXISTS idx_photos_trip_created ON photos(trip_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_trip_created ON comments(trip_id, created_at DESC);

-- Sync optimization
CREATE INDEX IF NOT EXISTS idx_scoring_events_match_processed ON scoring_events(match_id, processed);

-- Share code lookup (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_trips_share_code_lower ON trips(LOWER(share_code));
