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

-- Generate unique share codes for trips
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.share_code IS NULL THEN
        NEW.share_code := UPPER(SUBSTRING(MD5(NEW.id::TEXT || NOW()::TEXT) FROM 1 FOR 6));
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
    hole_handicaps INTEGER[] NOT NULL,
    hole_pars INTEGER[],
    yardages INTEGER[],
    total_yardage INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tee_sets_course_id ON tee_sets(course_id);

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
    team_a_player_ids UUID[] NOT NULL,
    team_b_player_ids UUID[] NOT NULL,
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
    created_at TIMESTAMPTZ DEFAULT NOW()
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
    created_at TIMESTAMPTZ DEFAULT NOW()
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
    related_entity_type TEXT
);

CREATE INDEX idx_audit_log_trip_id ON audit_log(trip_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);

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
-- Enable RLS on all tables (optional - uncomment if using Supabase Auth)
-- ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE players ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE hole_results ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tee_sets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE side_bets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- For now, allow public access (trip share codes provide access control)
-- CREATE POLICY "Public read access" ON trips FOR SELECT USING (true);
-- CREATE POLICY "Public insert access" ON trips FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Public update access" ON trips FOR UPDATE USING (true);

-- ============================================
-- VIEWS
-- ============================================

-- Live standings view
CREATE OR REPLACE VIEW live_standings AS
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

-- Active matches view
CREATE OR REPLACE VIEW active_matches AS
SELECT
    m.*,
    s.trip_id,
    s.name as session_name,
    s.session_type
FROM matches m
JOIN sessions s ON m.session_id = s.id
WHERE m.status = 'inProgress';
