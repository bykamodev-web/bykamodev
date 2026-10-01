const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

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
