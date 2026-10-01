/** Shape of a Workers Rate Limiting binding (`[[ratelimits]]` in wrangler.toml). */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

/**
 * True when the call may proceed. A missing or failing binding lets the call through:
 * the limiter is a cost guard, not an auth check, and local dev may not provide it.
 */
export async function checkRateLimit(limiter: RateLimiter | undefined, key: string): Promise<boolean> {
  if (!limiter) return true
  try {
    const { success } = await limiter.limit({ key })
    return success
  } catch (error) {
    console.error('Rate limiter failed:', error)
    return true
  }
}
