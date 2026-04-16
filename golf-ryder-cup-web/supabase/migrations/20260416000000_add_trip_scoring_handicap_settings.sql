-- Persist scoring and handicap settings on the trip so captains can review
-- and edit them after creation (especially for trips built via Quick Setup
-- where these steps were deferred).

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS scoring_settings JSONB,
  ADD COLUMN IF NOT EXISTS handicap_settings JSONB;
