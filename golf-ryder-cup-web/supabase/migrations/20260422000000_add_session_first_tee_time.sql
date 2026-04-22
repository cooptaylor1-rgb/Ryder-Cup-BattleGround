-- Add captain-specified first tee time to sessions.
--
-- Before this column existed the schedule had to infer times from the
-- AM/PM slot (defaulting to 8:00 or 13:00), which showed the wrong
-- clock time when a captain wanted a specific tee (e.g. 07:30 or 14:15).
-- Stored as TEXT "HH:MM" so it survives DST changes and avoids
-- timezone ambiguity; the app formats it locally for display.

ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS first_tee_time TEXT;

COMMENT ON COLUMN sessions.first_tee_time IS
    '24-hour "HH:MM" tee time the captain selected in session setup; preferred over AM/PM default in schedule UI.';
