-- Force server-side `updated_at = NOW()` on every INSERT/UPDATE for
-- trip-scoped tables so a mobile device with a skewed system clock
-- can't "stamp" future or past timestamps into cloud rows and
-- silently win last-write-wins conflict resolution.
--
-- Previously the client was the source of truth for updated_at. A
-- phone running ~10 minutes fast could overwrite a correctly-clocked
-- teammate's later edit because its incoming timestamp looked newer.
-- This trigger makes the Postgres server the sole authority for
-- updated_at; client-supplied values are ignored.
--
-- Clients still send updated_at so offline Dexie writes have a value
-- to show in the UI, but as soon as the write reaches Supabase the
-- trigger overrides it. The paired client change (tripSyncEntityWriters)
-- reads back the server-assigned updated_at so local Dexie catches up
-- to server time, keeping downstream LWW comparisons apples-to-apples.

CREATE OR REPLACE FUNCTION force_server_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop any legacy triggers by the same name to make this idempotent.
DROP TRIGGER IF EXISTS force_updated_at ON trips;
DROP TRIGGER IF EXISTS force_updated_at ON sessions;
DROP TRIGGER IF EXISTS force_updated_at ON matches;
DROP TRIGGER IF EXISTS force_updated_at ON hole_results;
DROP TRIGGER IF EXISTS force_updated_at ON teams;
DROP TRIGGER IF EXISTS force_updated_at ON team_members;
DROP TRIGGER IF EXISTS force_updated_at ON players;
DROP TRIGGER IF EXISTS force_updated_at ON side_bets;

CREATE TRIGGER force_updated_at BEFORE INSERT OR UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION force_server_updated_at();

CREATE TRIGGER force_updated_at BEFORE INSERT OR UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION force_server_updated_at();

CREATE TRIGGER force_updated_at BEFORE INSERT OR UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION force_server_updated_at();

CREATE TRIGGER force_updated_at BEFORE INSERT OR UPDATE ON hole_results
    FOR EACH ROW EXECUTE FUNCTION force_server_updated_at();

CREATE TRIGGER force_updated_at BEFORE INSERT OR UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION force_server_updated_at();

CREATE TRIGGER force_updated_at BEFORE INSERT OR UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION force_server_updated_at();

CREATE TRIGGER force_updated_at BEFORE INSERT OR UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION force_server_updated_at();

CREATE TRIGGER force_updated_at BEFORE INSERT OR UPDATE ON side_bets
    FOR EACH ROW EXECUTE FUNCTION force_server_updated_at();
