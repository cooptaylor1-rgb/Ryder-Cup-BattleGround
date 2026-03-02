import { describe, expect, it } from 'vitest';
import { buildUuidInFilter } from '@/lib/supabase/client';

describe('buildUuidInFilter', () => {
  it('returns an impossible eq filter when ids are empty', () => {
    expect(buildUuidInFilter('session_id', [])).toBe(
      'session_id=eq.00000000-0000-0000-0000-000000000000'
    );
  });

  it('returns a de-duplicated in filter for provided ids', () => {
    expect(
      buildUuidInFilter('match_id', [
        '11111111-1111-1111-1111-111111111111',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
      ])
    ).toBe(
      'match_id=in.(11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222)'
    );
  });
});
