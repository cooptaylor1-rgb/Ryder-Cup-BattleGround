-- Enforce (trip_id, session_number) uniqueness so concurrent offline
-- creates from multiple devices can't both commit the same session
-- number under the same trip. Before this, two captains on two phones
-- both seeing [1,2,3] in local cache would each push session #4, and
-- downstream code (tee-time defaults, schedule ordering, report sort)
-- would break.
--
-- The client-side fix in tripStore.addSession is a Dexie transaction
-- that bumps the number on conflict; this constraint is the server-side
-- backstop that rejects any duplicate that slips past the client check.

-- Clean up any existing duplicates before we enforce, keeping the oldest
-- row in each (trip_id, session_number) bucket and reassigning the rest
-- to fresh numbers above the current max for that trip.
DO $$
DECLARE
    dup RECORD;
    next_num INTEGER;
BEGIN
    FOR dup IN
        SELECT id, trip_id, session_number, created_at
        FROM (
            SELECT id, trip_id, session_number, created_at,
                   ROW_NUMBER() OVER (
                       PARTITION BY trip_id, session_number
                       ORDER BY created_at ASC, id ASC
                   ) AS rn
            FROM sessions
        ) ranked
        WHERE rn > 1
    LOOP
        SELECT COALESCE(MAX(session_number), 0) + 1 INTO next_num
        FROM sessions
        WHERE trip_id = dup.trip_id;
        UPDATE sessions SET session_number = next_num WHERE id = dup.id;
    END LOOP;
END $$;

ALTER TABLE sessions
    ADD CONSTRAINT sessions_trip_id_session_number_key
    UNIQUE (trip_id, session_number);
