// PURE, node-testable fixed-window rate limiter (audit M-5: throttle POST /api/request-review so
// an authenticated insider can't use the Studio's Mailgun relay as a spam/phishing cannon).
//
// PER-INSTANCE ONLY: the counters live in this module's in-memory Map, so the limit resets on a
// server restart and is NOT shared across multiple serverless instances / regions. For a hard,
// global guarantee a shared store (Redis / a DB / an upstream API gateway limit) would be needed;
// per-instance throttling is the pragmatic control for this single-function deployment.

export interface RateLimitOptions {
  /** Max allowed hits within the window. */
  max: number
  /** Window length in milliseconds. */
  windowMs: number
  /** Injectable clock (ms since epoch) — defaults to Date.now; override in tests. */
  now?: () => number
}

export interface RateLimitResult {
  /** False once the caller has exceeded `max` within the current window. */
  allowed: boolean
  /** Hits remaining in the window after this call (0 when blocked). */
  remaining: number
  /** Epoch ms when the current window resets (a fresh allowance begins). */
  resetAt: number
}

interface Bucket { count: number; resetAt: number }

/** Create an isolated limiter with its own bucket store (one per logical endpoint). */
export function createRateLimiter(options: RateLimitOptions) {
  const { max, windowMs } = options
  const clock = options.now ?? Date.now
  const buckets = new Map<string, Bucket>()

  /** Record one hit for `key` and report whether it is allowed under the fixed window. */
  function hit(key: string): RateLimitResult {
    const t = clock()
    const existing = buckets.get(key)
    // Start (or restart) the window if there is none or the prior one has elapsed.
    if (!existing || t >= existing.resetAt) {
      const bucket: Bucket = { count: 1, resetAt: t + windowMs }
      buckets.set(key, bucket)
      return { allowed: true, remaining: max - 1, resetAt: bucket.resetAt }
    }
    existing.count += 1
    const allowed = existing.count <= max
    return { allowed, remaining: allowed ? max - existing.count : 0, resetAt: existing.resetAt }
  }

  /** Drop the bucket for `key` (test/maintenance helper). */
  function reset(key: string): void {
    buckets.delete(key)
  }

  return { hit, reset }
}

export type RateLimiter = ReturnType<typeof createRateLimiter>
