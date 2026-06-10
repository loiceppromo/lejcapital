/**
 * Simple in-memory rate limiter for server actions.
 * Uses a sliding window approach with configurable limits.
 *
 * For production with multiple instances, replace with Redis-backed limiter.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

/** Clean up entries older than the window. Called periodically. */
function cleanup(windowMs: number) {
  const now = Date.now();
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

// Cleanup every 60 seconds
let cleanupInterval: ReturnType<typeof setInterval> | null = null;
function ensureCleanup(windowMs: number) {
  if (!cleanupInterval) {
    cleanupInterval = setInterval(() => cleanup(windowMs), 60_000);
    // Don't keep the process alive for cleanup
    if (typeof cleanupInterval === 'object' && 'unref' in cleanupInterval) {
      cleanupInterval.unref();
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

/**
 * Check rate limit for a given key.
 *
 * @param key - Unique identifier (e.g., user ID, IP + action name)
 * @param limit - Maximum number of requests in the window
 * @param windowMs - Time window in milliseconds (default: 60 seconds)
 */
export function checkRateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 60_000,
): RateLimitResult {
  ensureCleanup(windowMs);
  const now = Date.now();

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);

  if (entry.timestamps.length >= limit) {
    const oldestInWindow = entry.timestamps[0];
    return {
      allowed: false,
      remaining: 0,
      resetMs: oldestInWindow + windowMs - now,
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: limit - entry.timestamps.length,
    resetMs: windowMs,
  };
}

/**
 * Rate limit a server action. Throws if rate limited.
 *
 * @param identifier - User ID or session identifier
 * @param action - Action name for the rate limit key
 * @param limit - Max requests per window (default: 10)
 * @param windowMs - Window in ms (default: 60s)
 */
export function rateLimitAction(
  identifier: string,
  action: string,
  limit: number = 10,
  windowMs: number = 60_000,
): void {
  const key = `${action}:${identifier}`;
  const result = checkRateLimit(key, limit, windowMs);

  if (!result.allowed) {
    const retryAfter = Math.ceil(result.resetMs / 1000);
    throw new Error(
      `Rate limited. Too many ${action.replace(/_/g, ' ')} requests. Try again in ${retryAfter} seconds.`,
    );
  }
}
