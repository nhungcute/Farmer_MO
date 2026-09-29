const DEFAULT_BUCKETS_MS = Object.freeze([5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]);
const MAX_ROUTE_LABEL_LENGTH = 128;

function safeNumber(value, fallback = 0) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function routeLabel(route) {
  const raw = typeof route === "string" && route.length > 0 ? route : "UNKNOWN";
  const input = raw.replace(/^[A-Z]+\s+/u, "");
  // Preserve useful route names while preventing IDs/query strings from creating
  // unbounded metric cardinality. Request IDs are never included in labels.
  const path = input.split("?", 1)[0];
  let normalized = path
    .replace(/(\/api\/(?:orders|quests)\/)[^/]+(\/[^/]+)$/u, "$1:id$2")
    .replace(/\/[0-9a-f]{20,}(?=\/|$)/giu, "/:id")
    .replace(/\/\d+(?=\/|$)/gu, "/:id");
  return normalized.slice(0, MAX_ROUTE_LABEL_LENGTH);
}

function emptyHistogram(buckets) {
  return { count: 0, sumMs: 0, maxMs: 0, buckets: Object.fromEntries(buckets.map((bucket) => [String(bucket), 0])) };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Small in-process metrics collector for the prototype and the future
 * PostgreSQL runtime. It intentionally keeps bounded route cardinality and
 * does not retain cookies, payloads, session tokens, or request IDs.
 */
export class ApiMetrics {
  constructor({ buckets = DEFAULT_BUCKETS_MS, maxRoutes = 100, logRequests = false, clock = () => new Date() } = {}) {
    if (!Array.isArray(buckets) || buckets.length === 0 || buckets.some((value) => !Number.isFinite(value) || value <= 0)) {
      throw new TypeError("Metric duration buckets must be positive finite numbers.");
    }
    this.buckets = [...new Set(buckets)].sort((a, b) => a - b);
    this.maxRoutes = Number.isSafeInteger(maxRoutes) && maxRoutes >= 1 ? maxRoutes : 100;
    this.logRequests = Boolean(logRequests);
    this.clock = clock;
    this.reset();
  }

  reset() {
    this.startedAt = this.clock().toISOString();
    this.total = 0;
    this.errors = 0;
    this.byStatus = {};
    this.routes = new Map();
  }

  #routeKey(method, route) {
    const normalizedMethod = typeof method === "string" && /^[A-Z]+$/u.test(method) ? method : "UNKNOWN";
    const candidate = `${normalizedMethod} ${routeLabel(route)}`;
    if (this.routes.has(candidate) || this.routes.size < this.maxRoutes) return candidate;
    return "OTHER /:route";
  }

  #routeMetric(key) {
    if (!this.routes.has(key)) this.routes.set(key, { count: 0, errors: 0, duration: emptyHistogram(this.buckets) });
    return this.routes.get(key);
  }

  recordRequest({ method, route, statusCode, durationMs, requestId } = {}) {
    const status = Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599 ? statusCode : 500;
    const duration = safeNumber(durationMs);
    const key = this.#routeKey(method, route);
    const metric = this.#routeMetric(key);
    metric.count += 1;
    metric.duration.count += 1;
    metric.duration.sumMs += duration;
    metric.duration.maxMs = Math.max(metric.duration.maxMs, duration);
    for (const bucket of this.buckets) if (duration <= bucket) metric.duration.buckets[String(bucket)] += 1;
    this.total += 1;
    if (status >= 400) metric.errors += 1;
    if (status >= 500) this.errors += 1;
    const statusKey = String(status);
    this.byStatus[statusKey] = (this.byStatus[statusKey] || 0) + 1;
    return {
      event: "api.request",
      requestId: typeof requestId === "string" && requestId.length <= 128 ? requestId : undefined,
      method: key.split(" ", 1)[0],
      route: key.slice(key.indexOf(" ") + 1),
      status,
      durationMs: Number(duration.toFixed(3)),
    };
  }

  snapshot() {
    const routes = Object.fromEntries([...this.routes.entries()].map(([key, value]) => [key, clone(value)]));
    return {
      version: 1,
      startedAt: this.startedAt,
      total: this.total,
      errors: this.errors,
      byStatus: { ...this.byStatus },
      durationBucketsMs: [...this.buckets],
      routes,
    };
  }
}

export function createApiMetrics(options = {}) {
  return new ApiMetrics(options);
}
