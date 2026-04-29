-- Public-facing trip-join RPCs that authenticated users can invoke directly,
-- removing the dependency on SUPABASE_SERVICE_ROLE_KEY in the API route.
--
-- Background: /api/trips/join previously instantiated a service-role Supabase
-- client to (a) look up a trip by share_code (RLS forbids non-members from
-- SELECT-ing trips) and (b) insert a trip_membership row (RLS forbids
-- non-captains). Deployments missing SUPABASE_SERVICE_ROLE_KEY returned 503
-- and joining trips silently broke for end users who had no way to fix it.
--
-- These SECURITY DEFINER RPCs run with elevated privileges *only* for the
-- explicit join handshake — they require a valid auth.uid() (rejecting anon
-- callers) and only ever insert a membership for the caller's own auth user
-- onto a trip whose share_code matches. The route layer can call them with
-- the user's authenticated client and skip the admin client entirely.

-- lookup_trip_by_share_code is intentionally callable by both `anon` and
-- `authenticated`. The /join landing page renders a trip preview for
-- recipients of an invite link *before* they sign in, so requiring auth
-- here would force everyone to authenticate just to read the trip name
-- and dates. The previous admin-client GET route already exposed this
-- same surface to anon callers via the service role.
CREATE OR REPLACE FUNCTION public.lookup_trip_by_share_code(p_share_code text)
RETURNS TABLE (
  id uuid,
  name text,
  start_date date,
  end_date date,
  location text,
  captain_name text,
  share_code text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT t.id, t.name, t.start_date, t.end_date, t.location, t.captain_name, t.share_code
  FROM public.trips t
  WHERE t.share_code = upper(trim(p_share_code))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_trip_by_share_code(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- join_trip_by_share_code: idempotent membership creation for the caller.
-- Returns the trip preview + membership row as JSONB so the API route can
-- pass it through to the client unchanged. Raises a typed exception when
-- the trip can't be found or the caller is anonymous.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.join_trip_by_share_code(
  p_share_code text,
  p_invitation_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_trip public.trips%ROWTYPE;
  v_membership public.trip_memberships%ROWTYPE;
  v_player_id uuid;
  v_now timestamptz := now();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING errcode = '42501', message = 'auth-required';
  END IF;

  SELECT * INTO v_trip
  FROM public.trips
  WHERE share_code = upper(trim(p_share_code))
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING errcode = 'P0002', message = 'trip-not-found';
  END IF;

  -- Pull the caller's auth email once for player linking + invitation match.
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id LIMIT 1;

  -- Prefer an explicit auth-uid linked player; fall back to email match
  -- so a captain who pre-rostered someone by email still gets linked.
  SELECT id INTO v_player_id
  FROM public.players
  WHERE trip_id = v_trip.id AND linked_auth_user_id = v_user_id
  LIMIT 1;

  IF v_player_id IS NULL AND v_user_email IS NOT NULL THEN
    SELECT id INTO v_player_id
    FROM public.players
    WHERE trip_id = v_trip.id AND lower(email) = lower(v_user_email)
    LIMIT 1;
  END IF;

  -- Idempotent membership: re-running the join for an already-active member
  -- returns the existing row instead of inserting a duplicate.
  SELECT * INTO v_membership
  FROM public.trip_memberships
  WHERE trip_id = v_trip.id
    AND auth_user_id = v_user_id
    AND status IN ('active', 'pending')
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.trip_memberships (trip_id, auth_user_id, player_id, role, status)
    VALUES (v_trip.id, v_user_id, v_player_id, 'player', 'active')
    RETURNING * INTO v_membership;
  END IF;

  -- Mark the invitation accepted when one is supplied or matches the
  -- caller's email. Best-effort — failures here don't block the join.
  IF p_invitation_id IS NOT NULL THEN
    UPDATE public.trip_invitations
    SET status = 'accepted',
        accepted_by_auth_user_id = v_user_id,
        accepted_player_id = v_membership.player_id,
        accepted_at = v_now,
        updated_at = v_now
    WHERE id = p_invitation_id
      AND trip_id = v_trip.id
      AND status IN ('pending', 'sent', 'opened');
  ELSIF v_user_email IS NOT NULL THEN
    UPDATE public.trip_invitations
    SET status = 'accepted',
        accepted_by_auth_user_id = v_user_id,
        accepted_player_id = v_membership.player_id,
        accepted_at = v_now,
        updated_at = v_now
    WHERE trip_id = v_trip.id
      AND status IN ('pending', 'sent', 'opened')
      AND lower(recipient_email) = lower(v_user_email);
  END IF;

  RETURN jsonb_build_object(
    'tripId', v_trip.id,
    'shareCode', v_trip.share_code,
    'trip', jsonb_build_object(
      'id', v_trip.id,
      'name', v_trip.name,
      'startDate', v_trip.start_date,
      'endDate', v_trip.end_date,
      'location', v_trip.location,
      'captainName', v_trip.captain_name
    ),
    'membership', jsonb_build_object(
      'id', v_membership.id,
      'role', v_membership.role,
      'status', v_membership.status,
      'playerId', v_membership.player_id
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_trip_by_share_code(text, uuid) TO authenticated;
