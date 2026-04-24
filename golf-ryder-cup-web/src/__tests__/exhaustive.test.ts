import { describe, expect, it } from 'vitest';

import { assertExhaustive } from '@/lib/utils/exhaustive';

describe('assertExhaustive', () => {
  it('throws with the unhandled value serialized for diagnostics', () => {
    // Runtime-only path: type says `never`, but a malformed value
    // at runtime (e.g. a legacy sync queue item persisted before a
    // new entity variant existed) must not silently no-op.
    expect(() => assertExhaustive('legacy-entity' as never)).toThrow(
      /Unhandled variant: "legacy-entity"/
    );
  });

  it('uses the provided message prefix', () => {
    expect(() =>
      assertExhaustive({ entity: 'mystery' } as never, 'Unhandled sync entity')
    ).toThrow(/Unhandled sync entity:/);
  });
});
