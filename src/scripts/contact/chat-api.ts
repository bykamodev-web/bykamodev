import type { ChatMessage } from '../../lib/contact/chat-schema.ts'
import { parseNdjson, UPSTREAM_ERROR_MESSAGE, type ChatStreamEvent } from '../../lib/contact/ndjson.ts'
import { failureOf, postJson, readJson, type ApiFailure } from './request.ts'

/**
 * Calls to the AI endpoints. Every function here takes the session and the conversation
 * and nothing else: this module has no access to the contact fields.
 */

type Conversation = ReadonlyArray<ChatMessage>

const CHAT_FAILED = 'AI の応答を取得できませんでした。もう一度お試しください。'

export async function startSession(turnstile: string): Promise<{ ok: true; session: string; expiresAt: number } | ApiFailure> {
  const res = await postJson('/api/chat/session', { turnstile })
  if (!res?.ok) return failureOf(res, CHAT_FAILED)

  const data = await readJson(res)
  return typeof data.session === 'string' && typeof data.expiresAt === 'number'
    ? { ok: true, session: data.session, expiresAt: data.expiresAt }
    : { ok: false, status: res.status, error: CHAT_FAILED }
}

/** Streams one reply. Resolves once the server sent its closing `done` or `error` event. */
export async function streamChat(
  session: string,
  messages: Conversation,
  onDelta: (text: string) => void,
): Promise<{ ok: true; readyForSummary: boolean } | ApiFailure> {
  const res = await postJson('/api/chat', { session, messages })
  if (!res?.ok || !res.body) return failureOf(res, CHAT_FAILED)

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  const upstream: ApiFailure = { ok: false, status: 502, code: 'upstream_error', error: UPSTREAM_ERROR_MESSAGE }
  let rest = ''

  const handle = (events: ChatStreamEvent[]): { ok: true; readyForSummary: boolean } | ApiFailure | null => {
    for (const event of events) {
      if (event.type === 'delta') onDelta(event.text)
      else if (event.type === 'done') return { ok: true, readyForSummary: event.readyForSummary }
      else return { ...upstream, error: event.error, code: event.code }
    }
    return null
  }

  try {
    for (;;) {
      const { value, done } = await reader.read()
      const parsed = parseNdjson(rest, done ? '\n' : (value ?? ''))
      rest = parsed.rest

      const outcome = handle(parsed.events)
      if (outcome) return outcome
      if (done) return upstream
    }
  } catch {
    return upstream
  }
}

export async function requestSummary(
  session: string,
  messages: Conversation,
): Promise<{ ok: true; category: string; summary: string } | ApiFailure> {
  const res = await postJson('/api/chat/summary', { session, messages })
  if (!res?.ok) return failureOf(res, '要約を作成できませんでした。')

  const data = await readJson(res)
  return typeof data.category === 'string' && typeof data.summary === 'string'
    ? { ok: true, category: data.category, summary: data.summary }
    : { ok: false, status: 502, code: 'summary_failed', error: '要約を作成できませんでした。下の欄に直接ご記入ください。' }
}
