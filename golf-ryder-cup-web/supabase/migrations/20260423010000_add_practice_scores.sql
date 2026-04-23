-- Per-player practice-round stroke scores. Mirrors the Dexie
-- practiceScores table. Cup match scoring continues to live in
-- hole_results (team-vs-team winners); this table captures per-player
-- gross strokes during a practice group, which side bets and the
-- practice leaderboard can then consume.

CREATE TABLE IF NOT EXISTS practice_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
    gross INTEGER CHECK (gross IS NULL OR (gross BETWEEN 1 AND 20)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- One entry per (match, player, hole). Re-entering a stroke count
    -- for the same hole must update-in-place, not duplicate.
    UNIQUE (match_id, player_id, hole_number)
);

CREATE INDEX IF NOT EXISTS idx_practice_scores_match_id ON practice_scores(match_id);
CREATE INDEX IF NOT EXISTS idx_practice_scores_match_player ON practice_scores(match_id, player_id);

-- RLS: match the other player-scoped tables — authenticated users can
-- read/write any row on their trip. Tightening comes later if we
-- shift to per-trip RLS.
ALTER TABLE practice_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "practice_scores_select_all" ON practice_scores;
DROP POLICY IF EXISTS "practice_scores_insert_all" ON practice_scores;
DROP POLICY IF EXISTS "practice_scores_update_all" ON practice_scores;
DROP POLICY IF EXISTS "practice_scores_delete_all" ON practice_scores;

CREATE POLICY "practice_scores_select_all" ON practice_scores FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "practice_scores_insert_all" ON practice_scores FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "practice_scores_update_all" ON practice_scores FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "practice_scores_delete_all" ON practice_scores FOR DELETE USING (auth.role() = 'authenticated');

-- Server-side updated_at trigger, matching the pattern used for other
-- scored tables so sync LWW always compares against the server clock.
CREATE OR REPLACE FUNCTION practice_scores_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS practice_scores_force_updated_at ON practice_scores;
CREATE TRIGGER practice_scores_force_updated_at
  BEFORE INSERT OR UPDATE ON practice_scores
  FOR EACH ROW
  EXECUTE FUNCTION practice_scores_set_updated_at();
