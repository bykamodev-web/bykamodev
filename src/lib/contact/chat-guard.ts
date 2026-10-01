import type { z } from 'zod'
import type { ChatMessage, SignedChatMessage } from './chat-schema.ts'
import { consumeDailyQuota, type KvStore } from './daily-cap.ts'
import { clientKey, errorResponse, readJsonBody, zodDetails, type FieldIssue } from './http.ts'
import { runJevGate, type GatePurpose } from './jev-gate.ts'
import { DAILY_AI_CALL_LIMIT, DAILY_AI_CALL_LIMIT_PER_IP } from './limits.ts'
import { findPii, PII_LABELS } from './pii.ts'
import { checkRateLimit, type RateLimiter } from './rate-limit.ts'
import type { ServerEnv } from './server-env.ts'
import { verifyReply, verifySessionToken } from './session-token.ts'

/**
 * Everything that must hold before a conversation reaches the LLM, in order of cost:
 * shape → session → rate limits → genuine history → regex contact details → daily ceilings → Jev.
 */

export const GUARD_MESSAGES = {
  session_invalid: 'セッションの有効期限が切れました。もう一度お試しください。',
  rate_limited: '送信が続いています。1分ほど待ってからお試しください。',
  history_invalid: '会話の内容を確認できませんでした。ページを再読み込みして、最初からお試しください。',
  pii_detected: 'メールアドレスや電話番号は、最後の専用欄でお伺いします。チャットには書かずに送り直してください。',
  pii_suspected: 'お名前やご住所が含まれているようです。連絡先は最後の専用欄でお伺いしますので、書かずに送り直してください。',
  off_topic: 'ここではご相談内容の整理だけをお手伝いしています。相談したいことを教えてください。',
  chat_unavailable: 'ただいま AI での整理を受け付けられません。「フォームで直接送る」からお送りください。',
} as const

type GuardedRequest = { session: string; messages: SignedChatMessage[] }

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

/** Every assistant turn must carry the signature the Worker issued with it. */
async function historyIsGenuine(messages: ReadonlyArray<SignedChatMessage>, secret: string): Promise<boolean> {
  const checks = await Promise.all(messages.map((m) => (m.role === 'assistant' ? verifyReply(secret, m.content, m.sig) : true)))
  return checks.every(Boolean)
}

async function withinDailyQuota(env: ServerEnv, client: string, now: number): Promise<boolean> {
  const kv = env.CONTACT_KV as KvStore | undefined
  return (
    (await consumeDailyQuota(kv, now, `ip:${client}`, DAILY_AI_CALL_LIMIT_PER_IP)) &&
    (await consumeDailyQuota(kv, now, 'all', DAILY_AI_CALL_LIMIT))
  )
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
  if (!sessionSecret) return { ok: false, response: errorResponse(500, 'Server configuration error') }

  const verdict = await verifySessionToken(result.data.session, sessionSecret, now)
  if (!verdict.ok) return reject(401, 'session_invalid')

  const client = clientKey(request)
  const [sessionAllowed, clientAllowed] = await Promise.all([
    checkRateLimit(env.RL_CHAT_SESSION as RateLimiter | undefined, verdict.sid),
    checkRateLimit(env.RL_CHAT_IP as RateLimiter | undefined, client),
  ])
  if (!sessionAllowed || !clientAllowed) return reject(429, 'rate_limited', { headers: { 'Retry-After': '60' } })

  if (!(await historyIsGenuine(result.data.messages, sessionSecret))) return reject(400, 'history_invalid')
  const messages: ChatMessage[] = result.data.messages.map(({ role, content }) => ({ role, content }))

  const details = piiDetails(messages)
  if (details.length > 0) return reject(422, 'pii_detected', { details })

  // Counted before Jev: once the day's budget is spent, no paid service is called at all.
  if (!(await withinDailyQuota(env, client, now))) return reject(503, 'chat_unavailable')

  const gate = await runJevGate({ apiKey: typesafeApiKey, messages, purpose, fetchImpl })
  if (!gate.allow) return reject(422, gate.reason)

  return { ok: true, messages, sid: verdict.sid }
}
