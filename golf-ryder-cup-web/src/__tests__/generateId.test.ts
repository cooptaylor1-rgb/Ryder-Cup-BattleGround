import { describe, it, expect } from 'vitest';
import { generateId } from '@/lib/utils/generateId';

describe('generateId', () => {
  it('returns a valid UUID when no prefix is provided', () => {
    const id = generateId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('prepends the prefix followed by a dash', () => {
    const id = generateId('player');
    expect(id).toMatch(/^player-/);
    // After the prefix the rest should be a UUID
    const uuid = id.replace('player-', '');
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('generates unique IDs on successive calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});
