/**
 * In-memory sliding window rate limiter.
 *
 * Each limiter tracks request timestamps per key (typically an IP or user ID)
 * inside a rolling window. Once the count for a key exceeds the configured max,
 * subsequent requests are rejected until older entries fall outside the window.
 *
 * Note: This is process-local. In a single-instance deployment (which this
 * project targets) that is perfectly fine. For multi-instance deployments,
 * consider an external store like Redis.
 */

/**
 * @typedef {Object} RateLimiter
 * @property {(key: string) => { allowed: boolean, remaining: number, retryAfter: number }} check
 * @property {(key: string) => void} reset
 */

/**
 * Creates a sliding-window rate limiter.
 *
 * @param {{ windowMs: number, max: number }} opts
 * @returns {RateLimiter}
 */
export function createRateLimiter({ windowMs, max }) {
  /** @type {Map<string, number[]>} */
  const hits = new Map();

  // Periodically prune stale keys to prevent unbounded memory growth
  const PRUNE_INTERVAL = 60_000; // 1 minute
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of hits) {
      const valid = timestamps.filter((t) => now - t < windowMs);
      if (valid.length === 0) {
        hits.delete(key);
      } else {
        hits.set(key, valid);
      }
    }
  }, PRUNE_INTERVAL).unref(); // unref so the timer doesn't keep the process alive

  return {
    /**
     * Check whether a request from `key` is allowed and record it if so.
     *
     * @param {string} key
     * @returns {{ allowed: boolean, remaining: number, retryAfter: number }}
     */
    check(key) {
      const now = Date.now();
      const timestamps = (hits.get(key) || []).filter(
        (t) => now - t < windowMs,
      );

      if (timestamps.length >= max) {
        const oldest = timestamps[0];
        const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
        return { allowed: false, remaining: 0, retryAfter };
      }

      timestamps.push(now);
      hits.set(key, timestamps);
      return {
        allowed: true,
        remaining: max - timestamps.length,
        retryAfter: 0,
      };
    },

    /**
     * Reset the rate limit state for a given key (e.g., after a successful login).
     *
     * @param {string} key
     */
    reset(key) {
      hits.delete(key);
    },
  };
}

// ── Pre-configured limiters ──────────────────────────────────────────

/** Scan endpoint – generous but prevents abuse (5 scans per 10 minutes) */
export const scanLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
});

/** Config updates – 20 requests per minute */
export const configLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
});

/** Respect button – 30 per minute per IP (covers all repos) */
export const respectLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
});

/** Adoption toggle – 20 per minute */
export const adoptionLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
});

/** Account deletion – 3 per hour (serious action) */
export const accountDeleteLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
});

/**
 * Helper to extract a stable client identifier from a SvelteKit event.
 * Prefers the forwarded IP (set by reverse proxies), falls back to
 * event.getClientAddress().
 *
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {string}
 */
export function getClientKey(event) {
  return (
    event.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    event.getClientAddress()
  );
}
