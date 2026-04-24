-- Phase 3: trip-scoped Supabase authorization.
--
-- This migration preserves existing trips/players, adds the membership
-- model that RLS can reason about, backfills best-effort memberships from
-- existing roster data, and replaces broad authenticated policies with
-- trip-aware policies. Share-code lookup/redeem is intentionally handled by
-- server API routes using the service role; client-side table reads by
-- share_code are no longer a permission boundary.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Identity and ownership columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS linked_auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_profile_id uuid,
  ADD COLUMN IF NOT EXISTS joined_at timestamptz;

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS created_by_auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_profile_id uuid,
  ADD COLUMN IF NOT EXISTS creator_player_id uuid REFERENCES public.players(id) ON DELETE SET NULL;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.tee_sets
  ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_players_trip_id ON public.players(trip_id);
CREATE INDEX IF NOT EXISTS idx_players_linked_auth_user_id ON public.players(linked_auth_user_id);
CREATE INDEX IF NOT EXISTS idx_players_linked_profile_id ON public.players(linked_profile_id);
CREATE INDEX IF NOT EXISTS idx_trips_created_by_auth_user_id ON public.trips(created_by_auth_user_id);
CREATE INDEX IF NOT EXISTS idx_trips_creator_player_id ON public.trips(creator_player_id);
CREATE INDEX IF NOT EXISTS idx_courses_trip_id ON public.courses(trip_id);
CREATE INDEX IF NOT EXISTS idx_courses_created_by_auth_user_id ON public.courses(created_by_auth_user_id);
CREATE INDEX IF NOT EXISTS idx_tee_sets_trip_id ON public.tee_sets(trip_id);

-- ---------------------------------------------------------------------------
-- New persisted trip-critical tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.trip_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid,
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'player'
    CHECK (role IN ('captain', 'scorer', 'player', 'spectator')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'revoked', 'left')),
  invited_by_auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_memberships_has_identity CHECK (
    auth_user_id IS NOT NULL OR profile_id IS NOT NULL OR player_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS trip_memberships_active_auth_unique
  ON public.trip_memberships(trip_id, auth_user_id)
  WHERE auth_user_id IS NOT NULL AND status IN ('active', 'pending');

CREATE UNIQUE INDEX IF NOT EXISTS trip_memberships_active_profile_unique
  ON public.trip_memberships(trip_id, profile_id)
  WHERE profile_id IS NOT NULL AND status IN ('active', 'pending');

CREATE UNIQUE INDEX IF NOT EXISTS trip_memberships_active_player_unique
  ON public.trip_memberships(trip_id, player_id)
  WHERE player_id IS NOT NULL AND status IN ('active', 'pending');

CREATE INDEX IF NOT EXISTS idx_trip_memberships_trip_id ON public.trip_memberships(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_memberships_auth_user_id ON public.trip_memberships(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_trip_memberships_player_id ON public.trip_memberships(player_id);

CREATE TABLE IF NOT EXISTS public.trip_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  recipient_name text,
  recipient_email text,
  recipient_phone text,
  invite_code text,
  invite_url text,
  assigned_team text CHECK (assigned_team IS NULL OR assigned_team IN ('A', 'B')),
  role text NOT NULL DEFAULT 'player'
    CHECK (role IN ('captain', 'scorer', 'player', 'spectator')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'opened', 'accepted', 'declined', 'expired', 'revoked')),
  created_by_auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by_auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  sent_at timestamptz,
  opened_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS trip_invitations_invite_code_unique
  ON public.trip_invitations(invite_code)
  WHERE invite_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trip_invitations_trip_id ON public.trip_invitations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_recipient_email
  ON public.trip_invitations(lower(recipient_email))
  WHERE recipient_email IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
  category text NOT NULL DEFAULT 'general'
    CHECK (category IN ('general', 'schedule', 'lineup', 'weather', 'results')),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'archived')),
  author_auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  read_count integer NOT NULL DEFAULT 0 CHECK (read_count >= 0),
  total_recipients integer CHECK (total_recipients IS NULL OR total_recipients >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_trip_created
  ON public.announcements(trip_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'not-arrived'
    CHECK (status IN ('checked-in', 'en-route', 'not-arrived', 'no-show')),
  eta text,
  notes text,
  last_location text,
  check_in_time timestamptz,
  updated_by_auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS attendance_records_unique_scope
  ON public.attendance_records(
    trip_id,
    player_id,
    COALESCE(session_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE INDEX IF NOT EXISTS idx_attendance_records_trip_id ON public.attendance_records(trip_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_player_id ON public.attendance_records(player_id);

CREATE TABLE IF NOT EXISTS public.cart_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  cart_number text NOT NULL,
  player_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  max_capacity integer NOT NULL DEFAULT 2 CHECK (max_capacity > 0),
  notes text,
  created_by_auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cart_assignments_unique_scope
  ON public.cart_assignments(
    trip_id,
    COALESCE(session_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(match_id, '00000000-0000-0000-0000-000000000000'::uuid),
    cart_number
  );

CREATE INDEX IF NOT EXISTS idx_cart_assignments_trip_id ON public.cart_assignments(trip_id);
CREATE INDEX IF NOT EXISTS idx_cart_assignments_session_id ON public.cart_assignments(session_id);

CREATE TABLE IF NOT EXISTS public.dues_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (
    category IN (
      'green_fee',
      'cart_fee',
      'lodging',
      'food_beverage',
      'calcutta',
      'skins_pot',
      'side_bet',
      'custom'
    )
  ),
  description text NOT NULL,
  amount integer NOT NULL CHECK (amount >= 0),
  amount_paid integer NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  status text NOT NULL DEFAULT 'unpaid'
    CHECK (status IN ('unpaid', 'paid', 'partial', 'waived', 'disputed')),
  due_date timestamptz,
  paid_at timestamptz,
  paid_via text CHECK (paid_via IS NULL OR paid_via IN ('venmo', 'zelle', 'paypal', 'cash', 'check', 'other')),
  notes text,
  created_by uuid REFERENCES public.players(id) ON DELETE SET NULL,
  created_by_auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dues_line_items_trip_id ON public.dues_line_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_dues_line_items_player_id ON public.dues_line_items(player_id);
CREATE INDEX IF NOT EXISTS idx_dues_line_items_trip_status ON public.dues_line_items(trip_id, status);

CREATE TABLE IF NOT EXISTS public.payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  from_player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  to_player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  amount integer NOT NULL CHECK (amount >= 0),
  method text NOT NULL CHECK (method IN ('venmo', 'zelle', 'paypal', 'cash', 'check', 'other')),
  line_item_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  reference text,
  confirmed_by uuid REFERENCES public.players(id) ON DELETE SET NULL,
  confirmed_by_auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_records_trip_id ON public.payment_records(trip_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_from_player_id ON public.payment_records(from_player_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_created_at ON public.payment_records(trip_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Utility triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'trip_memberships',
    'trip_invitations',
    'announcements',
    'attendance_records',
    'cart_assignments',
    'dues_line_items',
    'payment_records'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();',
      tbl,
      tbl
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_trip_creator_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
DECLARE
  v_auth_uid uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' AND v_auth_uid IS NOT NULL THEN
    NEW.created_by_auth_user_id := v_auth_uid;

    IF NEW.creator_player_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM public.players p
         WHERE p.id = NEW.creator_player_id
           AND p.linked_auth_user_id = v_auth_uid
       ) THEN
      NEW.creator_player_id := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trips_set_creator_metadata ON public.trips;
CREATE TRIGGER trips_set_creator_metadata
  BEFORE INSERT ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.set_trip_creator_metadata();

CREATE OR REPLACE FUNCTION public.set_course_creator_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND auth.uid() IS NOT NULL THEN
    NEW.created_by_auth_user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS courses_set_creator_metadata ON public.courses;
CREATE TRIGGER courses_set_creator_metadata
  BEFORE INSERT ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_course_creator_metadata();

-- ---------------------------------------------------------------------------
-- Backfill existing rows without deleting or rewriting primary entities.
-- ---------------------------------------------------------------------------

UPDATE public.players p
SET trip_id = ranked.trip_id
FROM (
  SELECT
    tm.player_id,
    t.trip_id,
    row_number() OVER (
      PARTITION BY tm.player_id
      ORDER BY bool_or(tm.is_captain) DESC, min(tm.created_at) ASC
    ) AS rn
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  GROUP BY tm.player_id, t.trip_id
) ranked
WHERE ranked.player_id = p.id
  AND ranked.rn = 1
  AND p.trip_id IS NULL;

UPDATE public.trips tr
SET creator_player_id = captain.player_id
FROM (
  SELECT DISTINCT ON (t.trip_id)
    t.trip_id,
    tm.player_id
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE tm.is_captain = true
  ORDER BY t.trip_id, tm.created_at ASC
) captain
WHERE captain.trip_id = tr.id
  AND tr.creator_player_id IS NULL;

UPDATE public.trips tr
SET created_by_auth_user_id = p.linked_auth_user_id,
    created_by_profile_id = p.linked_profile_id
FROM public.players p
WHERE p.id = tr.creator_player_id
  AND (tr.created_by_auth_user_id IS NULL OR tr.created_by_profile_id IS NULL);

UPDATE public.courses c
SET trip_id = course_trip.trip_id
FROM (
  SELECT
    m.course_id,
    min(s.trip_id) AS trip_id,
    count(DISTINCT s.trip_id) AS trip_count
  FROM public.matches m
  JOIN public.sessions s ON s.id = m.session_id
  WHERE m.course_id IS NOT NULL
  GROUP BY m.course_id
) course_trip
WHERE course_trip.course_id = c.id
  AND course_trip.trip_count = 1
  AND c.trip_id IS NULL;

UPDATE public.tee_sets ts
SET trip_id = COALESCE(c.trip_id, tee_trip.trip_id)
FROM public.courses c
LEFT JOIN (
  SELECT
    m.tee_set_id,
    min(s.trip_id) AS trip_id,
    count(DISTINCT s.trip_id) AS trip_count
  FROM public.matches m
  JOIN public.sessions s ON s.id = m.session_id
  WHERE m.tee_set_id IS NOT NULL
  GROUP BY m.tee_set_id
) tee_trip ON tee_trip.tee_set_id = ts.id AND tee_trip.trip_count = 1
WHERE c.id = ts.course_id
  AND ts.trip_id IS NULL
  AND COALESCE(c.trip_id, tee_trip.trip_id) IS NOT NULL;

INSERT INTO public.trip_memberships (
  trip_id,
  auth_user_id,
  profile_id,
  player_id,
  role,
  status,
  created_at,
  updated_at
)
SELECT
  p.trip_id,
  p.linked_auth_user_id,
  p.linked_profile_id,
  p.id,
  CASE WHEN captain_members.player_id IS NOT NULL THEN 'captain' ELSE 'player' END,
  'active',
  COALESCE(p.joined_at, p.created_at, now()),
  COALESCE(p.updated_at, now())
FROM public.players p
LEFT JOIN (
  SELECT DISTINCT tm.player_id
  FROM public.team_members tm
  WHERE tm.is_captain = true
) captain_members ON captain_members.player_id = p.id
WHERE p.trip_id IS NOT NULL
  AND (p.linked_auth_user_id IS NOT NULL OR p.linked_profile_id IS NOT NULL OR p.id IS NOT NULL)
ON CONFLICT DO NOTHING;

INSERT INTO public.trip_memberships (
  trip_id,
  auth_user_id,
  profile_id,
  player_id,
  role,
  status
)
SELECT
  tr.id,
  tr.created_by_auth_user_id,
  tr.created_by_profile_id,
  tr.creator_player_id,
  'captain',
  'active'
FROM public.trips tr
WHERE tr.created_by_auth_user_id IS NOT NULL
   OR tr.created_by_profile_id IS NOT NULL
   OR tr.creator_player_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Promote creator/captain membership rows when a previous insert landed as player.
UPDATE public.trip_memberships tm
SET role = 'captain'
FROM public.trips tr
WHERE tm.trip_id = tr.id
  AND tm.status = 'active'
  AND tm.role <> 'captain'
  AND (
    (tr.created_by_auth_user_id IS NOT NULL AND tm.auth_user_id = tr.created_by_auth_user_id)
    OR (tr.creator_player_id IS NOT NULL AND tm.player_id = tr.creator_player_id)
  );

-- ---------------------------------------------------------------------------
-- RLS helper functions. SECURITY DEFINER avoids recursive policy checks while
-- still exposing only boolean/role answers to table policies.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_trip_role(p_trip_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT tm.role
  FROM public.trip_memberships tm
  WHERE tm.trip_id = p_trip_id
    AND tm.status = 'active'
    AND tm.auth_user_id = auth.uid()
  ORDER BY CASE tm.role
    WHEN 'captain' THEN 1
    WHEN 'scorer' THEN 2
    WHEN 'player' THEN 3
    WHEN 'spectator' THEN 4
    ELSE 5
  END
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_trip_role(p_trip_id uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(public.current_user_trip_role(p_trip_id) = ANY(p_roles), false);
$$;

CREATE OR REPLACE FUNCTION public.is_trip_member(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT public.current_user_trip_role(p_trip_id) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.is_trip_captain(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT public.has_trip_role(p_trip_id, ARRAY['captain']);
$$;

CREATE OR REPLACE FUNCTION public.get_team_trip_id(p_team_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT trip_id FROM public.teams WHERE id = p_team_id;
$$;

CREATE OR REPLACE FUNCTION public.get_session_trip_id(p_session_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT trip_id FROM public.sessions WHERE id = p_session_id;
$$;

CREATE OR REPLACE FUNCTION public.get_match_trip_id(p_match_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.trip_id
  FROM public.matches m
  JOIN public.sessions s ON s.id = m.session_id
  WHERE m.id = p_match_id;
$$;

CREATE OR REPLACE FUNCTION public.player_belongs_to_current_user(p_player_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.players p
    WHERE p.id = p_player_id
      AND p.linked_auth_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.trip_memberships tm
    WHERE tm.player_id = p_player_id
      AND tm.auth_user_id = auth.uid()
      AND tm.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_score_match(p_match_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_trip_id uuid;
  v_team_a uuid[];
  v_team_b uuid[];
  v_role text;
BEGIN
  SELECT s.trip_id, m.team_a_player_ids, m.team_b_player_ids
  INTO v_trip_id, v_team_a, v_team_b
  FROM public.matches m
  JOIN public.sessions s ON s.id = m.session_id
  WHERE m.id = p_match_id;

  IF v_trip_id IS NULL THEN
    RETURN false;
  END IF;

  v_role := public.current_user_trip_role(v_trip_id);
  IF v_role IN ('captain', 'scorer') THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.trip_memberships tm
    WHERE tm.trip_id = v_trip_id
      AND tm.auth_user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role = 'player'
      AND tm.player_id = ANY(COALESCE(v_team_a, '{}'::uuid[]) || COALESCE(v_team_b, '{}'::uuid[]))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_trip_creator_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.created_by_auth_user_id IS NOT NULL
     OR NEW.created_by_profile_id IS NOT NULL
     OR NEW.creator_player_id IS NOT NULL THEN
    INSERT INTO public.trip_memberships (
      trip_id,
      auth_user_id,
      profile_id,
      player_id,
      role,
      status
    )
    VALUES (
      NEW.id,
      NEW.created_by_auth_user_id,
      NEW.created_by_profile_id,
      NEW.creator_player_id,
      'captain',
      'active'
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trips_ensure_creator_membership ON public.trips;
CREATE TRIGGER trips_ensure_creator_membership
  AFTER INSERT OR UPDATE OF created_by_auth_user_id, created_by_profile_id, creator_player_id ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_trip_creator_membership();

CREATE OR REPLACE FUNCTION public.ensure_player_trip_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_auth_membership_id uuid;
BEGIN
  IF NEW.trip_id IS NOT NULL
     AND (NEW.linked_auth_user_id IS NOT NULL OR NEW.linked_profile_id IS NOT NULL) THEN
    IF NEW.linked_auth_user_id IS NOT NULL THEN
      UPDATE public.trip_memberships tm
      SET player_id = COALESCE(tm.player_id, NEW.id),
          profile_id = COALESCE(tm.profile_id, NEW.linked_profile_id),
          updated_at = now()
      WHERE tm.trip_id = NEW.trip_id
        AND tm.auth_user_id = NEW.linked_auth_user_id
        AND tm.status = 'active'
      RETURNING tm.id INTO v_existing_auth_membership_id;
    END IF;

    IF v_existing_auth_membership_id IS NOT NULL THEN
      DELETE FROM public.trip_memberships tm
      WHERE tm.trip_id = NEW.trip_id
        AND tm.player_id = NEW.id
        AND tm.auth_user_id IS NULL
        AND tm.id <> v_existing_auth_membership_id;
    ELSE
      UPDATE public.trip_memberships tm
      SET auth_user_id = COALESCE(tm.auth_user_id, NEW.linked_auth_user_id),
          profile_id = COALESCE(tm.profile_id, NEW.linked_profile_id),
          player_id = COALESCE(tm.player_id, NEW.id),
          updated_at = now()
      WHERE tm.trip_id = NEW.trip_id
        AND tm.player_id = NEW.id
        AND tm.status = 'active';
    END IF;

    INSERT INTO public.trip_memberships (
      trip_id,
      auth_user_id,
      profile_id,
      player_id,
      role,
      status
    )
    VALUES (
      NEW.trip_id,
      NEW.linked_auth_user_id,
      NEW.linked_profile_id,
      NEW.id,
      'player',
      'active'
    )
    ON CONFLICT DO NOTHING;

    UPDATE public.trip_memberships tm
    SET player_id = COALESCE(tm.player_id, NEW.id),
        profile_id = COALESCE(tm.profile_id, NEW.linked_profile_id),
        updated_at = now()
    WHERE tm.trip_id = NEW.trip_id
      AND tm.status = 'active'
      AND NEW.linked_auth_user_id IS NOT NULL
      AND tm.auth_user_id = NEW.linked_auth_user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS players_ensure_trip_membership ON public.players;
CREATE TRIGGER players_ensure_trip_membership
  AFTER INSERT OR UPDATE OF trip_id, linked_auth_user_id, linked_profile_id ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_player_trip_membership();

-- ---------------------------------------------------------------------------
-- Replace broad policies with trip-scoped policies.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT *
    FROM (
      VALUES
        ('trips', 'trips_select_all'),
        ('trips', 'trips_insert_all'),
        ('trips', 'trips_update_all'),
        ('trips', 'trips_delete_all'),
        ('teams', 'teams_select_all'),
        ('teams', 'teams_insert_all'),
        ('teams', 'teams_update_all'),
        ('teams', 'teams_delete_all'),
        ('team_members', 'team_members_select_all'),
        ('team_members', 'team_members_insert_all'),
        ('team_members', 'team_members_update_all'),
        ('team_members', 'team_members_delete_all'),
        ('players', 'players_select_all'),
        ('players', 'players_insert_all'),
        ('players', 'players_update_all'),
        ('players', 'players_delete_all'),
        ('sessions', 'sessions_select_all'),
        ('sessions', 'sessions_insert_all'),
        ('sessions', 'sessions_update_all'),
        ('sessions', 'sessions_delete_all'),
        ('courses', 'courses_select_all'),
        ('courses', 'courses_insert_all'),
        ('courses', 'courses_update_all'),
        ('courses', 'courses_delete_all'),
        ('tee_sets', 'tee_sets_select_all'),
        ('tee_sets', 'tee_sets_insert_all'),
        ('tee_sets', 'tee_sets_update_all'),
        ('tee_sets', 'tee_sets_delete_all'),
        ('matches', 'matches_select_all'),
        ('matches', 'matches_insert_all'),
        ('matches', 'matches_update_all'),
        ('matches', 'matches_delete_all'),
        ('hole_results', 'hole_results_select_all'),
        ('hole_results', 'hole_results_insert_all'),
        ('hole_results', 'hole_results_update_all'),
        ('hole_results', 'hole_results_delete_all'),
        ('side_bets', 'side_bets_select_all'),
        ('side_bets', 'side_bets_insert_all'),
        ('side_bets', 'side_bets_update_all'),
        ('side_bets', 'side_bets_delete_all'),
        ('achievements', 'achievements_select_all'),
        ('achievements', 'achievements_insert_all'),
        ('achievements', 'achievements_update_all'),
        ('achievements', 'achievements_delete_all'),
        ('audit_log', 'audit_log_select_all'),
        ('audit_log', 'audit_log_insert_all'),
        ('audit_log', 'audit_log_update_all'),
        ('audit_log', 'audit_log_delete_all'),
        ('practice_scores', 'practice_scores_select_all'),
        ('practice_scores', 'practice_scores_insert_all'),
        ('practice_scores', 'practice_scores_update_all'),
        ('practice_scores', 'practice_scores_delete_all'),
        ('banter_posts', 'banter_posts_select_all'),
        ('banter_posts', 'banter_posts_insert_all'),
        ('banter_posts', 'banter_posts_update_all'),
        ('banter_posts', 'banter_posts_delete_all')
    ) AS policies(table_name, policy_name)
    WHERE to_regclass('public.' || policies.table_name) IS NOT NULL
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I;',
      policy_row.policy_name,
      policy_row.table_name
    );
  END LOOP;
END;
$$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'trips',
    'players',
    'teams',
    'team_members',
    'sessions',
    'matches',
    'hole_results',
    'courses',
    'tee_sets',
    'side_bets',
    'achievements',
    'audit_log',
    'practice_scores',
    'banter_posts',
    'trip_memberships',
    'trip_invitations',
    'announcements',
    'attendance_records',
    'cart_assignments',
    'dues_line_items',
    'payment_records'
  ]
  LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    END IF;
  END LOOP;
END;
$$;

-- Memberships
CREATE POLICY "trip_memberships_select_trip_members"
  ON public.trip_memberships FOR SELECT
  USING (public.is_trip_member(trip_id));

CREATE POLICY "trip_memberships_insert_captain"
  ON public.trip_memberships FOR INSERT
  WITH CHECK (public.is_trip_captain(trip_id));

CREATE POLICY "trip_memberships_update_captain"
  ON public.trip_memberships FOR UPDATE
  USING (public.is_trip_captain(trip_id))
  WITH CHECK (public.is_trip_captain(trip_id));

CREATE POLICY "trip_memberships_delete_captain"
  ON public.trip_memberships FOR DELETE
  USING (public.is_trip_captain(trip_id));

-- Trips
CREATE POLICY "trips_select_trip_members"
  ON public.trips FOR SELECT
  USING (public.is_trip_member(id));

CREATE POLICY "trips_insert_authenticated"
  ON public.trips FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND created_by_auth_user_id = auth.uid()
    AND (
      creator_player_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.players p
        WHERE p.id = creator_player_id
          AND p.linked_auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "trips_update_captain"
  ON public.trips FOR UPDATE
  USING (public.is_trip_captain(id))
  WITH CHECK (public.is_trip_captain(id));

CREATE POLICY "trips_delete_captain"
  ON public.trips FOR DELETE
  USING (public.is_trip_captain(id));

-- Players
CREATE POLICY "players_select_trip_members_or_self"
  ON public.players FOR SELECT
  USING (
    public.player_belongs_to_current_user(id)
    OR (trip_id IS NOT NULL AND public.is_trip_member(trip_id))
  );

CREATE POLICY "players_insert_captain_or_self"
  ON public.players FOR INSERT
  WITH CHECK (
    (trip_id IS NOT NULL AND public.is_trip_captain(trip_id))
    OR (
      trip_id IS NOT NULL
      AND public.is_trip_member(trip_id)
      AND linked_auth_user_id = auth.uid()
    )
  );

CREATE POLICY "players_update_captain_or_self"
  ON public.players FOR UPDATE
  USING (
    (trip_id IS NOT NULL AND public.is_trip_captain(trip_id))
    OR public.player_belongs_to_current_user(id)
  )
  WITH CHECK (
    (trip_id IS NOT NULL AND public.is_trip_captain(trip_id))
    OR linked_auth_user_id = auth.uid()
  );

CREATE POLICY "players_delete_captain"
  ON public.players FOR DELETE
  USING (trip_id IS NOT NULL AND public.is_trip_captain(trip_id));

-- Teams and team members
CREATE POLICY "teams_select_trip_members"
  ON public.teams FOR SELECT
  USING (public.is_trip_member(trip_id));

CREATE POLICY "teams_insert_captain"
  ON public.teams FOR INSERT
  WITH CHECK (public.is_trip_captain(trip_id));

CREATE POLICY "teams_update_captain"
  ON public.teams FOR UPDATE
  USING (public.is_trip_captain(trip_id))
  WITH CHECK (public.is_trip_captain(trip_id));

CREATE POLICY "teams_delete_captain"
  ON public.teams FOR DELETE
  USING (public.is_trip_captain(trip_id));

CREATE POLICY "team_members_select_trip_members"
  ON public.team_members FOR SELECT
  USING (public.is_trip_member(public.get_team_trip_id(team_id)));

CREATE POLICY "team_members_insert_captain"
  ON public.team_members FOR INSERT
  WITH CHECK (public.is_trip_captain(public.get_team_trip_id(team_id)));

CREATE POLICY "team_members_update_captain"
  ON public.team_members FOR UPDATE
  USING (public.is_trip_captain(public.get_team_trip_id(team_id)))
  WITH CHECK (public.is_trip_captain(public.get_team_trip_id(team_id)));

CREATE POLICY "team_members_delete_captain"
  ON public.team_members FOR DELETE
  USING (public.is_trip_captain(public.get_team_trip_id(team_id)));

-- Sessions, matches, and scoring
CREATE POLICY "sessions_select_trip_members"
  ON public.sessions FOR SELECT
  USING (public.is_trip_member(trip_id));

CREATE POLICY "sessions_insert_captain"
  ON public.sessions FOR INSERT
  WITH CHECK (public.is_trip_captain(trip_id));

CREATE POLICY "sessions_update_captain"
  ON public.sessions FOR UPDATE
  USING (public.is_trip_captain(trip_id))
  WITH CHECK (public.is_trip_captain(trip_id));

CREATE POLICY "sessions_delete_captain"
  ON public.sessions FOR DELETE
  USING (public.is_trip_captain(trip_id));

CREATE POLICY "matches_select_trip_members"
  ON public.matches FOR SELECT
  USING (public.is_trip_member(public.get_session_trip_id(session_id)));

CREATE POLICY "matches_insert_captain"
  ON public.matches FOR INSERT
  WITH CHECK (public.is_trip_captain(public.get_session_trip_id(session_id)));

CREATE POLICY "matches_update_captain_or_scorer"
  ON public.matches FOR UPDATE
  USING (
    public.is_trip_captain(public.get_session_trip_id(session_id))
    OR public.can_score_match(id)
  )
  WITH CHECK (
    public.is_trip_captain(public.get_session_trip_id(session_id))
    OR public.can_score_match(id)
  );

CREATE POLICY "matches_delete_captain"
  ON public.matches FOR DELETE
  USING (public.is_trip_captain(public.get_session_trip_id(session_id)));

CREATE POLICY "hole_results_select_trip_members"
  ON public.hole_results FOR SELECT
  USING (public.is_trip_member(public.get_match_trip_id(match_id)));

CREATE POLICY "hole_results_insert_scorer"
  ON public.hole_results FOR INSERT
  WITH CHECK (public.can_score_match(match_id));

CREATE POLICY "hole_results_update_scorer"
  ON public.hole_results FOR UPDATE
  USING (public.can_score_match(match_id))
  WITH CHECK (public.can_score_match(match_id));

CREATE POLICY "hole_results_delete_scorer"
  ON public.hole_results FOR DELETE
  USING (public.can_score_match(match_id));

-- Courses stay usable as a shared legacy library, but trip-bound rows are
-- scoped to members and mutable only by the owning user or trip captain.
CREATE POLICY "courses_select_member_or_shared"
  ON public.courses FOR SELECT
  USING (
    trip_id IS NULL
    OR created_by_auth_user_id = auth.uid()
    OR public.is_trip_member(trip_id)
  );

CREATE POLICY "courses_insert_authenticated"
  ON public.courses FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND created_by_auth_user_id = auth.uid()
    AND (trip_id IS NULL OR public.is_trip_captain(trip_id))
  );

CREATE POLICY "courses_update_owner_or_captain"
  ON public.courses FOR UPDATE
  USING (
    created_by_auth_user_id = auth.uid()
    OR (trip_id IS NOT NULL AND public.is_trip_captain(trip_id))
  )
  WITH CHECK (
    created_by_auth_user_id = auth.uid()
    OR (trip_id IS NOT NULL AND public.is_trip_captain(trip_id))
  );

CREATE POLICY "courses_delete_owner_or_captain"
  ON public.courses FOR DELETE
  USING (
    created_by_auth_user_id = auth.uid()
    OR (trip_id IS NOT NULL AND public.is_trip_captain(trip_id))
  );

CREATE POLICY "tee_sets_select_member_or_shared"
  ON public.tee_sets FOR SELECT
  USING (
    trip_id IS NULL
    OR public.is_trip_member(trip_id)
    OR EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = tee_sets.course_id
        AND (c.created_by_auth_user_id = auth.uid() OR c.trip_id IS NULL OR public.is_trip_member(c.trip_id))
    )
  );

CREATE POLICY "tee_sets_insert_authenticated"
  ON public.tee_sets FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      trip_id IS NULL
      OR public.is_trip_captain(trip_id)
      OR EXISTS (
        SELECT 1
        FROM public.courses c
        WHERE c.id = tee_sets.course_id
          AND c.created_by_auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "tee_sets_update_owner_or_captain"
  ON public.tee_sets FOR UPDATE
  USING (
    (trip_id IS NOT NULL AND public.is_trip_captain(trip_id))
    OR EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = tee_sets.course_id
        AND c.created_by_auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    (trip_id IS NOT NULL AND public.is_trip_captain(trip_id))
    OR EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = tee_sets.course_id
        AND c.created_by_auth_user_id = auth.uid()
    )
  );

CREATE POLICY "tee_sets_delete_owner_or_captain"
  ON public.tee_sets FOR DELETE
  USING (
    (trip_id IS NOT NULL AND public.is_trip_captain(trip_id))
    OR EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = tee_sets.course_id
        AND c.created_by_auth_user_id = auth.uid()
    )
  );

-- Trip tools
CREATE POLICY "trip_invitations_select_trip_members"
  ON public.trip_invitations FOR SELECT
  USING (public.is_trip_member(trip_id));

CREATE POLICY "trip_invitations_insert_captain"
  ON public.trip_invitations FOR INSERT
  WITH CHECK (public.is_trip_captain(trip_id));

CREATE POLICY "trip_invitations_update_captain"
  ON public.trip_invitations FOR UPDATE
  USING (public.is_trip_captain(trip_id))
  WITH CHECK (public.is_trip_captain(trip_id));

CREATE POLICY "trip_invitations_delete_captain"
  ON public.trip_invitations FOR DELETE
  USING (public.is_trip_captain(trip_id));

CREATE POLICY "announcements_select_trip_members"
  ON public.announcements FOR SELECT
  USING (public.is_trip_member(trip_id));

CREATE POLICY "announcements_insert_captain"
  ON public.announcements FOR INSERT
  WITH CHECK (public.is_trip_captain(trip_id));

CREATE POLICY "announcements_update_captain"
  ON public.announcements FOR UPDATE
  USING (public.is_trip_captain(trip_id))
  WITH CHECK (public.is_trip_captain(trip_id));

CREATE POLICY "announcements_delete_captain"
  ON public.announcements FOR DELETE
  USING (public.is_trip_captain(trip_id));

CREATE POLICY "attendance_records_select_trip_members"
  ON public.attendance_records FOR SELECT
  USING (public.is_trip_member(trip_id));

CREATE POLICY "attendance_records_insert_captain_or_self"
  ON public.attendance_records FOR INSERT
  WITH CHECK (public.is_trip_captain(trip_id) OR public.player_belongs_to_current_user(player_id));

CREATE POLICY "attendance_records_update_captain_or_self"
  ON public.attendance_records FOR UPDATE
  USING (public.is_trip_captain(trip_id) OR public.player_belongs_to_current_user(player_id))
  WITH CHECK (public.is_trip_captain(trip_id) OR public.player_belongs_to_current_user(player_id));

CREATE POLICY "attendance_records_delete_captain"
  ON public.attendance_records FOR DELETE
  USING (public.is_trip_captain(trip_id));

CREATE POLICY "cart_assignments_select_trip_members"
  ON public.cart_assignments FOR SELECT
  USING (public.is_trip_member(trip_id));

CREATE POLICY "cart_assignments_insert_captain"
  ON public.cart_assignments FOR INSERT
  WITH CHECK (public.is_trip_captain(trip_id));

CREATE POLICY "cart_assignments_update_captain"
  ON public.cart_assignments FOR UPDATE
  USING (public.is_trip_captain(trip_id))
  WITH CHECK (public.is_trip_captain(trip_id));

CREATE POLICY "cart_assignments_delete_captain"
  ON public.cart_assignments FOR DELETE
  USING (public.is_trip_captain(trip_id));

CREATE POLICY "dues_line_items_select_trip_members"
  ON public.dues_line_items FOR SELECT
  USING (public.is_trip_member(trip_id));

CREATE POLICY "dues_line_items_insert_captain"
  ON public.dues_line_items FOR INSERT
  WITH CHECK (public.is_trip_captain(trip_id));

CREATE POLICY "dues_line_items_update_captain"
  ON public.dues_line_items FOR UPDATE
  USING (public.is_trip_captain(trip_id))
  WITH CHECK (public.is_trip_captain(trip_id));

CREATE POLICY "dues_line_items_delete_captain"
  ON public.dues_line_items FOR DELETE
  USING (public.is_trip_captain(trip_id));

CREATE POLICY "payment_records_select_trip_members"
  ON public.payment_records FOR SELECT
  USING (public.is_trip_member(trip_id));

CREATE POLICY "payment_records_insert_captain"
  ON public.payment_records FOR INSERT
  WITH CHECK (public.is_trip_captain(trip_id));

CREATE POLICY "payment_records_update_captain"
  ON public.payment_records FOR UPDATE
  USING (public.is_trip_captain(trip_id))
  WITH CHECK (public.is_trip_captain(trip_id));

CREATE POLICY "payment_records_delete_captain"
  ON public.payment_records FOR DELETE
  USING (public.is_trip_captain(trip_id));

-- Other trip-scoped tables
CREATE POLICY "side_bets_select_trip_members"
  ON public.side_bets FOR SELECT
  USING (public.is_trip_member(trip_id));

CREATE POLICY "side_bets_insert_captain"
  ON public.side_bets FOR INSERT
  WITH CHECK (public.is_trip_captain(trip_id));

CREATE POLICY "side_bets_update_captain"
  ON public.side_bets FOR UPDATE
  USING (public.is_trip_captain(trip_id))
  WITH CHECK (public.is_trip_captain(trip_id));

CREATE POLICY "side_bets_delete_captain"
  ON public.side_bets FOR DELETE
  USING (public.is_trip_captain(trip_id));

CREATE POLICY "achievements_select_trip_members"
  ON public.achievements FOR SELECT
  USING (public.is_trip_member(trip_id));

CREATE POLICY "achievements_insert_captain"
  ON public.achievements FOR INSERT
  WITH CHECK (public.is_trip_captain(trip_id));

CREATE POLICY "achievements_update_captain"
  ON public.achievements FOR UPDATE
  USING (public.is_trip_captain(trip_id))
  WITH CHECK (public.is_trip_captain(trip_id));

CREATE POLICY "achievements_delete_captain"
  ON public.achievements FOR DELETE
  USING (public.is_trip_captain(trip_id));

CREATE POLICY "audit_log_select_trip_members"
  ON public.audit_log FOR SELECT
  USING (public.is_trip_member(trip_id));

CREATE POLICY "audit_log_insert_captain"
  ON public.audit_log FOR INSERT
  WITH CHECK (public.is_trip_captain(trip_id));

CREATE POLICY "audit_log_update_captain"
  ON public.audit_log FOR UPDATE
  USING (public.is_trip_captain(trip_id))
  WITH CHECK (public.is_trip_captain(trip_id));

CREATE POLICY "audit_log_delete_captain"
  ON public.audit_log FOR DELETE
  USING (public.is_trip_captain(trip_id));

CREATE POLICY "practice_scores_select_trip_members"
  ON public.practice_scores FOR SELECT
  USING (public.is_trip_member(public.get_match_trip_id(match_id)));

CREATE POLICY "practice_scores_insert_scorer"
  ON public.practice_scores FOR INSERT
  WITH CHECK (public.can_score_match(match_id));

CREATE POLICY "practice_scores_update_scorer"
  ON public.practice_scores FOR UPDATE
  USING (public.can_score_match(match_id))
  WITH CHECK (public.can_score_match(match_id));

CREATE POLICY "practice_scores_delete_scorer"
  ON public.practice_scores FOR DELETE
  USING (public.can_score_match(match_id));

CREATE POLICY "banter_posts_select_trip_members"
  ON public.banter_posts FOR SELECT
  USING (public.is_trip_member(trip_id));

CREATE POLICY "banter_posts_insert_trip_members"
  ON public.banter_posts FOR INSERT
  WITH CHECK (public.is_trip_member(trip_id));

CREATE POLICY "banter_posts_update_author_or_captain"
  ON public.banter_posts FOR UPDATE
  USING (
    public.is_trip_captain(trip_id)
    OR (author_id IS NOT NULL AND public.player_belongs_to_current_user(author_id))
  )
  WITH CHECK (
    public.is_trip_captain(trip_id)
    OR (author_id IS NOT NULL AND public.player_belongs_to_current_user(author_id))
  );

CREATE POLICY "banter_posts_delete_author_or_captain"
  ON public.banter_posts FOR DELETE
  USING (
    public.is_trip_captain(trip_id)
    OR (author_id IS NOT NULL AND public.player_belongs_to_current_user(author_id))
  );

INSERT INTO public.deployment_migration_markers (id, description)
VALUES
  ('20260424010000_trip_memberships_and_trip_scoped_rls', 'trip memberships, persisted captain tools, and trip-scoped RLS')
ON CONFLICT (id) DO UPDATE
SET description = EXCLUDED.description,
    applied_at = public.deployment_migration_markers.applied_at;
