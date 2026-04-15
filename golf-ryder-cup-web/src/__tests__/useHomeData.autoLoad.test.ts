import { describe, expect, it } from 'vitest';
import { shouldRecoverToDateActiveTrip } from '@/lib/hooks/useHomeData';

describe('shouldRecoverToDateActiveTrip', () => {
  it('does not recover when current trip is present in trip list', () => {
    expect(shouldRecoverToDateActiveTrip('trip-practice', ['trip-main', 'trip-practice'])).toBe(false);
  });

  it('recovers when current trip is missing from trip list', () => {
    expect(shouldRecoverToDateActiveTrip('trip-practice', ['trip-main'])).toBe(true);
  });

  it('does not recover when current trip is not set', () => {
    expect(shouldRecoverToDateActiveTrip(undefined, ['trip-main'])).toBe(false);
  });
});
