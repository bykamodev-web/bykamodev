/** The slice of a Workers KV namespace this module needs. */
export interface KvStore {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
}

const TWO_DAYS_SECONDS = 2 * 24 * 60 * 60

export function dailyKey(now: number, scope: string): string {
  return `ai-calls:${new Date(now).toISOString().slice(0, 10)}:${scope}`
}

/**
 * Counts one AI call against a per-UTC-day ceiling for `scope` ("all", or one client).
 * KV is eventually consistent and get→put is not atomic, so the count is approximate:
 * good enough to stop a runaway bill, not an exact meter. True when the call may proceed.
 */
export async function consumeDailyQuota(kv: KvStore | undefined, now: number, scope: string, limit: number): Promise<boolean> {
  if (!kv) return true

  try {
    const key = dailyKey(now, scope)
    const used = Number.parseInt((await kv.get(key)) ?? '0', 10) || 0
    if (used >= limit) return false

    await kv.put(key, String(used + 1), { expirationTtl: TWO_DAYS_SECONDS })
    return true
  } catch (error) {
    console.error('Daily quota store failed:', error)
    return true
  }
}
