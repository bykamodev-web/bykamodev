import type { z } from 'zod'
import type { ChatMessage } from './chat-schema.ts'
import { consumeDailyQuota, type KvStore } from './daily-cap.ts'
import { clientIp, errorResponse, readJsonBody, zodDetails, type FieldIssue } from './http.ts'
import { runJevGate, type GatePurpose } from './jev-gate.ts'
import { findPii, PII_LABELS } from './pii.ts'
import { checkRateLimit, type RateLimiter } from './rate-limit.ts'
import type { ServerEnv } from './server-env.ts'
import { verifySessionToken } from './session-token.ts'

/**
 * Everything that must hold before a conversation reaches the LLM, in order of cost:
 * shape → session → rate limits → regex contact details → Jev → daily ceiling.
 */

export const GUARD_MESSAGES = {
  session_invalid: 'セッションの有効期限が切れました。もう一度お試しください。',
  rate_limited: '送信が続いています。1分ほど待ってからお試しください。',
  pii_detected: 'メールアドレスや電話番号は、最後の専用欄でお伺いします。チャットには書かずに送り直してください。',
  pii_suspected: 'お名前やご住所が含まれているようです。連絡先は最後の専用欄でお伺いしますので、書かずに送り直してください。',
  off_topic: 'ここではご相談内容の整理だけをお手伝いしています。相談したいことを教えてください。',
  chat_unavailable: 'ただいま AI での整理を受け付けられません。「フォームで直接送る」からお送りください。',
} as const

type GuardedRequest = { session: string; messages: ChatMessage[] }

export type GuardResult = { ok: true; messages: ChatMessage[]; sid: string } | { ok: false; response: Response }

const reject = (status: number, code: keyof typeof GUARD_MESSAGES, extra: { details?: FieldIssue[]; headers?: Record<string, string> } = {}): GuardResult => ({
  ok: false,
  response: errorResponse(status, GUARD_MESSAGES[code], { code, ...extra }),
})

function piiDetails(messages: ReadonlyArray<ChatMessage>): FieldIssue[] {
  return messages.flatMap((message, index) => {
    const kinds = message.role === 'user' ? findPii(message.content) : []
    return kinds.length > 0
      ? [{ field: `messages.${index}.content`, message: `${kinds.map((k) => PII_LABELS[k]).join('・')}が含まれています` }]
      : []
  })
}

export async function guardChatRequest(options: {
  request: Request
  env: ServerEnv
  schema: z.ZodType<GuardedRequest>
  purpose: GatePurpose
  sessionSecret: string | undefined
  typesafeApiKey: string | undefined
  now: number
  fetchImpl?: typeof fetch
}): Promise<GuardResult> {
  const { request, env, schema, purpose, sessionSecret, typesafeApiKey, now, fetchImpl } = options

  const parsed = await readJsonBody(request)
  if (!parsed.ok) return { ok: false, response: parsed.response }

  const result = schema.safeParse(parsed.body)
  if (!result.success) {
    return { ok: false, response: errorResponse(400, 'バリデーションエラー', { details: zodDetails(result.error) }) }
  }
  const { session, messages } = result.data

  if (!sessionSecret) return { ok: false, response: errorResponse(500, 'Server configuration error') }

  const verdict = await verifySessionToken(session, sessionSecret, now)
  if (!verdict.ok) return reject(401, 'session_invalid')

  const [sessionAllowed, ipAllowed] = await Promise.all([
    checkRateLimit(env.RL_CHAT_SESSION as RateLimiter | undefined, verdict.sid),
    checkRateLimit(env.RL_CHAT_IP as RateLimiter | undefined, clientIp(request)),
  ])
  if (!sessionAllowed || !ipAllowed) return reject(429, 'rate_limited', { headers: { 'Retry-After': '60' } })

  const details = piiDetails(messages)
  if (details.length > 0) return reject(422, 'pii_detected', { details })

  const gate = await runJevGate({ apiKey: typesafeApiKey, messages, purpose, fetchImpl })
  if (!gate.allow) return reject(422, gate.reason)

  if (!(await consumeDailyQuota(env.CONTACT_KV as KvStore | undefined, now))) return reject(503, 'chat_unavailable')

  return { ok: true, messages, sid: verdict.sid }
}
