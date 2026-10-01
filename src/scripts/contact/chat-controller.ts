import type { ChatMessage } from '../../lib/contact/chat-schema.ts'
import { requestSummary, startSession, streamChat } from './chat-api.ts'
import type { ApiFailure } from './request.ts'
import { describeTurnstileFailure, type TokenSource } from './turnstile.ts'

/**
 * Owns the chat session: gets one from Turnstile on first use, renews it when the server
 * says it expired, and maps server answers to what the page should do next.
 */

type Conversation = ReadonlyArray<ChatMessage>
type Session = { token: string; expiresAt: number }

export type TurnOutcome =
  | { kind: 'done'; readyForSummary: boolean }
  | { kind: 'rejected'; notice: string }
  | { kind: 'unavailable'; notice: string }

export type SummaryOutcome =
  | { kind: 'ready'; category: string; summary: string }
  | { kind: 'manual'; notice: string }
  | { kind: 'rejected'; notice: string }
  | { kind: 'unavailable'; notice: string }

export interface ChatController {
  send(messages: Conversation, onDelta: (text: string) => void): Promise<TurnOutcome>
  summarize(messages: Conversation): Promise<SummaryOutcome>
}

const RENEW_MARGIN_MS = 60_000
const SESSION_FAILED = 'セッションを更新できませんでした。ページを再読み込みしてお試しください。'

const failed = (failure: ApiFailure): { kind: 'rejected' | 'unavailable'; notice: string } => ({
  kind: failure.code === 'chat_unavailable' ? 'unavailable' : 'rejected',
  notice: failure.error,
})

export function createChatController(tokens: TokenSource): ChatController {
  let session: Session | null = null

  const ensureSession = async (): Promise<{ ok: true; token: string } | ApiFailure> => {
    if (session && session.expiresAt - Date.now() > RENEW_MARGIN_MS) return { ok: true, token: session.token }

    let turnstile: string
    try {
      turnstile = await tokens.getFreshToken()
    } catch (error) {
      return { ok: false, status: 0, error: describeTurnstileFailure(error) }
    }

    const started = await startSession(turnstile)
    if (!started.ok) return started

    session = { token: started.session, expiresAt: started.expiresAt }
    return { ok: true, token: started.session }
  }

  /** Runs `call` with a session, renewing it once if the server no longer accepts it. */
  const withSession = async <T extends { ok: true }>(call: (token: string) => Promise<T | ApiFailure>): Promise<T | ApiFailure> => {
    for (const attempt of [1, 2]) {
      const current = await ensureSession()
      if (!current.ok) return current

      const result = await call(current.token)
      if (result.ok || result.code !== 'session_invalid' || attempt === 2) return result
      session = null
    }
    return { ok: false, status: 401, error: SESSION_FAILED }
  }

  return {
    async send(messages, onDelta) {
      const result = await withSession((token) => streamChat(token, messages, onDelta))
      return result.ok ? { kind: 'done', readyForSummary: result.readyForSummary } : failed(result)
    },

    async summarize(messages) {
      const result = await withSession((token) => requestSummary(token, messages))
      if (result.ok) return { kind: 'ready', category: result.category, summary: result.summary }
      return result.code === 'summary_failed' ? { kind: 'manual', notice: result.error } : failed(result)
    },
  }
}
