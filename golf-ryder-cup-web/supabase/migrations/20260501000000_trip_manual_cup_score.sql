-- Captain-set cup score override.
--
-- Why: the standings engine computes team points by replaying hole_results
-- through calculateMatchState — there's no path to "set the score" except
-- by entering hole-by-hole data. Captains who play rounds outside the app
-- (e.g. the round happened on paper, or the trip was created mid-event)
-- have no way to make the leaderboard read a known total without
-- fabricating dozens of hole_results rows that real entries would later
-- conflict with.
--
-- These two columns let the captain pin the displayed score. When both
-- are non-null, the standings engine uses them in place of the computed
-- points but leaves match counts (played / completed / remaining) and
-- per-match data alone, so any future real entries continue to work. Set
-- both back to NULL to fall back to the computed score.

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS manual_team_a_points NUMERIC(5, 1),
  ADD COLUMN IF NOT EXISTS manual_team_b_points NUMERIC(5, 1);

COMMENT ON COLUMN trips.manual_team_a_points IS
  'Captain-set override for team A''s cup points. When both manual_team_*_points are set, the standings engine displays these instead of computed totals. NULL = fall back to computed.';
COMMENT ON COLUMN trips.manual_team_b_points IS
  'Captain-set override for team B''s cup points. See manual_team_a_points.';
