// Best-effort, in-memory fixed-window rate limiter.
// Good enough to stop casual abuse of a public demo (e.g. someone burning your AI key).
// On serverless hosts each instance has its own memory, so this is a soft limit, not a guarantee.

type Bucket = { count: number; resetAt: number };

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const buckets = new Map<string, Bucket>();

  return function check(key: string, now = Date.now()): { ok: boolean; retryAfterSec: number } {
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      if (buckets.size > 10_000) buckets.clear(); // keep memory bounded
      return { ok: true, retryAfterSec: 0 };
    }
    bucket.count++;
    if (bucket.count > limit) {
      return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
    }
    return { ok: true, retryAfterSec: 0 };
  };
}

/** Client IP as seen behind common proxies (Vercel, Render). Falls back to a shared key. */
export function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
