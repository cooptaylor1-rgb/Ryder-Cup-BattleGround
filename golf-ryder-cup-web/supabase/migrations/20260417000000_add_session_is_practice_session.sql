-- Allow a session inside a cup trip to be flagged as a casual practice
-- round (e.g. "Day 0 Practice Round" before Friday's Foursomes). Practice
-- sessions don't contribute to the cup leaderboard but still get paired
-- and scored so captains can track handicaps and keep the app useful on
-- warm-up day.

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS is_practice_session BOOLEAN NOT NULL DEFAULT FALSE;
