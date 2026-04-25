// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(
    __dirname,
    '../../supabase/migrations/20260424010000_trip_memberships_and_trip_scoped_rls.sql'
  ),
  'utf8'
);

describe('trip-scoped RLS migration contract', () => {
  it('adds persisted trip-critical tables', () => {
    for (const table of [
      'trip_memberships',
      'trip_invitations',
      'announcements',
      'attendance_records',
      'cart_assignments',
      'dues_line_items',
      'payment_records',
    ]) {
      expect(migration).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`, 'i'));
      expect(migration).toContain(`'${table}'`);
    }
    expect(migration).toContain('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY');
  });

  it('adds player identity and trip creator metadata without rewriting existing rows', () => {
    expect(migration).toMatch(/ALTER TABLE public\.players[\s\S]*linked_auth_user_id uuid/i);
    expect(migration).toMatch(/ALTER TABLE public\.players[\s\S]*linked_profile_id uuid/i);
    expect(migration).toMatch(/ALTER TABLE public\.trips[\s\S]*created_by_auth_user_id uuid/i);
    expect(migration).toMatch(/ALTER TABLE public\.trips[\s\S]*creator_player_id uuid/i);
    expect(migration).toMatch(/INSERT INTO public\.trip_memberships[\s\S]*FROM public\.players p/i);
    expect(migration).toMatch(/UPDATE public\.players p[\s\S]*SET trip_id = ranked\.trip_id/i);
  });

  it('defines role helpers and scorer-aware match policies', () => {
    expect(migration).toContain("CHECK (role IN ('captain', 'scorer', 'player', 'spectator'))");
    expect(migration).toMatch(/FUNCTION public\.current_user_trip_role\(p_trip_id uuid\)/i);
    expect(migration).toMatch(/FUNCTION public\.can_score_match\(p_match_id uuid\)/i);
    expect(migration).toMatch(/CREATE POLICY "matches_update_captain_or_scorer"/i);
    expect(migration).toMatch(/CREATE POLICY "hole_results_insert_scorer"/i);
    expect(migration).toMatch(/CREATE POLICY "practice_scores_insert_scorer"/i);
  });

  it('drops broad authenticated policies and replaces them with trip-member policies', () => {
    for (const policy of [
      'trips_select_all',
      'teams_select_all',
      'players_select_all',
      'sessions_select_all',
      'matches_select_all',
      'hole_results_select_all',
      'side_bets_select_all',
      'practice_scores_select_all',
      'banter_posts_select_all',
    ]) {
      expect(migration).toContain(policy);
    }

    expect(migration).toContain('DROP POLICY IF EXISTS %I ON public.%I');
    expect(migration).toMatch(/CREATE POLICY "trips_select_trip_members"[\s\S]*public\.is_trip_member\(id\)/i);
    expect(migration).toMatch(/CREATE POLICY "teams_select_trip_members"[\s\S]*public\.is_trip_member\(trip_id\)/i);
    expect(migration).toMatch(/CREATE POLICY "players_select_trip_members_or_self"/i);
    expect(migration).not.toMatch(/CREATE POLICY "trip_memberships_insert_[\s\S]*auth_user_id = auth\.uid\(\)[\s\S]*role = 'player'/i);
  });

  it('prevents client-created trips from claiming arbitrary creator players', () => {
    expect(migration).toMatch(/NEW\.created_by_auth_user_id := v_auth_uid/i);
    expect(migration).toMatch(/NEW\.creator_player_id := NULL/i);
    expect(migration).toMatch(
      /CREATE POLICY "trips_insert_authenticated"[\s\S]*created_by_auth_user_id = auth\.uid\(\)[\s\S]*linked_auth_user_id = auth\.uid\(\)/i
    );
    expect(migration).toMatch(
      /CREATE POLICY "courses_insert_authenticated"[\s\S]*created_by_auth_user_id = auth\.uid\(\)[\s\S]*public\.is_trip_captain\(trip_id\)/i
    );
  });

  it('records a health marker for strict Railway readiness checks', () => {
    expect(migration).toContain('20260424010000_trip_memberships_and_trip_scoped_rls');
    expect(migration).toContain('deployment_migration_markers');
  });
});
