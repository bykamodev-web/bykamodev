import type { APIRoute } from 'astro'
import { GUARD_MESSAGES } from '@/lib/contact/chat-guard'
import { sessionRequestSchema } from '@/lib/contact/chat-schema'
import { clientIp, clientKey, errorResponse, jsonResponse, readJsonBody, zodDetails } from '@/lib/contact/http'
import { checkRateLimit, type RateLimiter } from '@/lib/contact/rate-limit'
import { getEnv } from '@/lib/contact/server-env'
import { issueSessionToken } from '@/lib/contact/session-token'
import { verifyTurnstile } from '@/lib/contact/turnstile'
import { chatSecrets } from '../_secrets'

export const prerender = false

/** Trades one Turnstile token for a short-lived chat session, so later turns need no challenge. */
export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals)

  const parsed = await readJsonBody(request)
  if (!parsed.ok) return parsed.response

  const result = sessionRequestSchema.safeParse(parsed.body)
  if (!result.success) {
    return errorResponse(400, 'バリデーションエラー', { details: zodDetails(result.error) })
  }

  const ip = clientIp(request)
  if (!(await checkRateLimit(env.RL_SUBMIT_IP as RateLimiter | undefined, `start:${clientKey(request)}`))) {
    return errorResponse(429, GUARD_MESSAGES.rate_limited, { code: 'rate_limited', headers: { 'Retry-After': '60' } })
  }

  const secrets = chatSecrets(env)
  if (!secrets.openai || !secrets.session) {
    return errorResponse(503, GUARD_MESSAGES.chat_unavailable, { code: 'chat_unavailable' })
  }
  if (!secrets.turnstile) return errorResponse(500, 'Server configuration error')

  const verdict = await verifyTurnstile({ secret: secrets.turnstile, token: result.data.turnstile, remoteIp: ip })
  if (!verdict.ok) {
    return errorResponse(403, '認証に失敗しました。もう一度お試しください。', { code: 'turnstile_failed' })
  }

  const issued = await issueSessionToken(secrets.session, Date.now())
  return jsonResponse({ success: true, session: issued.token, expiresAt: issued.expiresAt }, 200)
}
