-- Banter posts finally get a cloud home. Before this, the table
-- lived only in local Dexie — a message typed on one device was
-- invisible on every other. Mirrors the practice_scores migration
-- shape: trip-scoped, open-read RLS for authenticated users,
-- server-side updated_at trigger for last-write-wins.

CREATE TABLE IF NOT EXISTS banter_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    author_id UUID,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    post_type TEXT NOT NULL DEFAULT 'text',
    emoji TEXT,
    reactions JSONB,
    related_match_id UUID,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banter_posts_trip_id ON banter_posts(trip_id);
CREATE INDEX IF NOT EXISTS idx_banter_posts_timestamp ON banter_posts(trip_id, timestamp DESC);

ALTER TABLE banter_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "banter_posts_select_all" ON banter_posts;
DROP POLICY IF EXISTS "banter_posts_insert_all" ON banter_posts;
DROP POLICY IF EXISTS "banter_posts_update_all" ON banter_posts;
DROP POLICY IF EXISTS "banter_posts_delete_all" ON banter_posts;

CREATE POLICY "banter_posts_select_all" ON banter_posts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "banter_posts_insert_all" ON banter_posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "banter_posts_update_all" ON banter_posts FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "banter_posts_delete_all" ON banter_posts FOR DELETE USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION banter_posts_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS banter_posts_force_updated_at ON banter_posts;
CREATE TRIGGER banter_posts_force_updated_at
  BEFORE INSERT OR UPDATE ON banter_posts
  FOR EACH ROW
  EXECUTE FUNCTION banter_posts_set_updated_at();
