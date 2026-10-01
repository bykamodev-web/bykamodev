const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Cloudflare's documented always-pass test keys. A real site key only issues tokens on the
 * hostnames registered for its widget (localhost gets error 110200), and a real secret
 * rejects test tokens, so `astro dev` uses this pair. Only ever read behind `import.meta.env.DEV`.
 * https://developers.cloudflare.com/turnstile/troubleshooting/testing/
 */
export const TURNSTILE_TEST_KEYS = {
  siteKey: '1x00000000000000000000AA',
  secret: '1x0000000000000000000000000000000AA',
} as const

export type TurnstileVerdict = { ok: boolean; errorCodes: string[] }

/** Turnstile tokens are single-use: verify each one exactly once. */
export async function verifyTurnstile(options: {
  secret: string
  token: string
  remoteIp?: string
  fetchImpl?: typeof fetch
}): Promise<TurnstileVerdict> {
  const { secret, token, remoteIp, fetchImpl = fetch } = options

  try {
    const res = await fetchImpl(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, ...(remoteIp ? { remoteip: remoteIp } : {}) }).toString(),
    })
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] }
    return { ok: data.success === true, errorCodes: data['error-codes'] ?? [] }
  } catch (error) {
    console.error('Turnstile siteverify failed:', error)
    return { ok: false, errorCodes: ['siteverify-unreachable'] }
  }
}
