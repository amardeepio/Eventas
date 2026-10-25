interface Bucket { count: number; resetAt: number }

/** Small in-memory limiter. Suitable for a single instance; use shared storage at scale. */
export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  constructor(private readonly limit: number, private readonly windowMs: number) {}

  check(key: string, now = Date.now()): { allowed: boolean; retryAfter: number } {
    if (this.buckets.size > 5000) {
      for (const [id, bucket] of this.buckets) if (bucket.resetAt <= now) this.buckets.delete(id);
    }
    const current = this.buckets.get(key);
    if (!current || current.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, retryAfter: 0 };
    }
    if (current.count >= this.limit) {
      return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
    }
    current.count += 1;
    return { allowed: true, retryAfter: 0 };
  }
}

// Route bundles can be evaluated separately; a global keeps one shared budget per instance.
const globalLimits = globalThis as typeof globalThis & {
  __eventasRateLimiters?: { minute: RateLimiter; day: RateLimiter; translateMinute: RateLimiter; translateDay: RateLimiter };
};
globalLimits.__eventasRateLimiters ??= {
  minute: new RateLimiter(12, 60_000),
  day: new RateLimiter(300, 86_400_000),
  // A single page view needs a handful of batched translation calls.
  translateMinute: new RateLimiter(90, 60_000),
  translateDay: new RateLimiter(6_000, 86_400_000),
};

export const aiRateLimiter = globalLimits.__eventasRateLimiters.minute;
export const dailyAiLimiter = globalLimits.__eventasRateLimiters.day;
export const translateRateLimiter = globalLimits.__eventasRateLimiters.translateMinute;
export const translateDailyLimiter = globalLimits.__eventasRateLimiters.translateDay;
