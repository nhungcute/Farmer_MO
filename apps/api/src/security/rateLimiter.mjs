const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 120;
const DEFAULT_MAX_CLIENTS = 4096;

function positiveInteger(value, fallback) {
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

/**
 * Bounded fixed-window limiter for the single-instance demo API.
 *
 * The key is supplied by the HTTP boundary (currently nginx's X-Real-IP),
 * never a cookie or session token. Expired buckets are pruned on every
 * request, and the oldest bucket is evicted when the client map is full.
 */
export class ApiRateLimiter {
  constructor({ limit = DEFAULT_LIMIT, windowMs = DEFAULT_WINDOW_MS, maxClients = DEFAULT_MAX_CLIENTS, now = () => Date.now() } = {}) {
    this.limit = positiveInteger(limit, DEFAULT_LIMIT);
    this.windowMs = positiveInteger(windowMs, DEFAULT_WINDOW_MS);
    this.maxClients = positiveInteger(maxClients, DEFAULT_MAX_CLIENTS);
    this.now = now;
    this.buckets = new Map();
  }

  #prune(now) {
    for (const [key, bucket] of this.buckets) if (bucket.expiresAt <= now) this.buckets.delete(key);
  }

  #evictIfFull() {
    if (this.buckets.size < this.maxClients) return;
    let oldestKey;
    let oldestExpires = Number.POSITIVE_INFINITY;
    for (const [key, bucket] of this.buckets) {
      if (bucket.expiresAt < oldestExpires) { oldestKey = key; oldestExpires = bucket.expiresAt; }
    }
    if (oldestKey !== undefined) this.buckets.delete(oldestKey);
  }

  consume(clientKey) {
    const key = typeof clientKey === "string" && clientKey.trim() ? clientKey.trim().slice(0, 128) : "unknown";
    const observedNow = this.now();
    const now = Number.isFinite(observedNow) ? observedNow : Date.now();
    this.#prune(now);
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.expiresAt <= now) {
      this.#evictIfFull();
      bucket = { count: 0, expiresAt: now + this.windowMs };
      this.buckets.set(key, bucket);
    }
    if (bucket.count >= this.limit) {
      return { allowed: false, retryAfterMs: Math.max(1, bucket.expiresAt - now), remaining: 0 };
    }
    bucket.count += 1;
    return { allowed: true, retryAfterMs: 0, remaining: Math.max(0, this.limit - bucket.count) };
  }

  size() { return this.buckets.size; }
}

export const API_RATE_LIMIT_DEFAULTS = Object.freeze({
  limit: DEFAULT_LIMIT,
  windowMs: DEFAULT_WINDOW_MS,
  maxClients: DEFAULT_MAX_CLIENTS,
});
