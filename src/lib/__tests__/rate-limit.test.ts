import { describe, it, expect } from 'vitest';
import { checkRateLimit, rateLimitAction } from '../rate-limit';

describe('checkRateLimit', () => {
  it('allows requests within the limit', () => {
    const key = `test-allow-${Date.now()}`;
    const r1 = checkRateLimit(key, 3, 60_000);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(key, 3, 60_000);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit(key, 3, 60_000);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('blocks requests beyond the limit', () => {
    const key = `test-block-${Date.now()}`;
    checkRateLimit(key, 2, 60_000);
    checkRateLimit(key, 2, 60_000);
    const blocked = checkRateLimit(key, 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetMs).toBeGreaterThan(0);
  });
});

describe('rateLimitAction', () => {
  it('does not throw within limit', () => {
    const id = `action-ok-${Date.now()}`;
    expect(() => rateLimitAction(id, 'test_action', 5, 60_000)).not.toThrow();
  });

  it('throws when rate limited', () => {
    const id = `action-block-${Date.now()}`;
    rateLimitAction(id, 'test_action', 1, 60_000);
    expect(() => rateLimitAction(id, 'test_action', 1, 60_000)).toThrow(/Rate limited/);
  });
});
