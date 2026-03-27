import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { safeParse } from '@/lib/utils/safeParse';

// Suppress logger output during tests
vi.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('safeParse', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
  });

  it('parses valid JSON that matches the schema', () => {
    const result = safeParse('{"name":"Alice","age":30}', schema);
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('returns null for null input', () => {
    expect(safeParse(null, schema)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(safeParse(undefined, schema)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(safeParse('', schema)).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(safeParse('{broken', schema)).toBeNull();
  });

  it('returns null when JSON is valid but does not match schema', () => {
    expect(safeParse('{"name":123}', schema)).toBeNull();
  });

  it('returns null when schema requires a field that is missing', () => {
    expect(safeParse('{"name":"Bob"}', schema)).toBeNull();
  });

  it('strips extra keys when schema is strict', () => {
    const strict = z.object({ id: z.number() }).strict();
    expect(safeParse('{"id":1,"extra":true}', strict)).toBeNull();
  });

  it('passes through extra keys when schema uses passthrough', () => {
    const loose = z.object({ id: z.number() }).passthrough();
    const result = safeParse('{"id":1,"extra":true}', loose);
    expect(result).toEqual({ id: 1, extra: true });
  });
});
