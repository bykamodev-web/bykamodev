import type { APIRoute } from 'astro'
import { GUARD_MESSAGES, guardChatRequest } from '@/lib/contact/chat-guard'
import { chatRequestSchema, countUserTurns } from '@/lib/contact/chat-schema'
import { errorResponse } from '@/lib/contact/http'
import { MAX_USER_TURNS, MIN_USER_TURNS_FOR_SUMMARY } from '@/lib/contact/limits'
import { chatEventStream } from '@/lib/contact/ndjson'
import { createOpenAIClient, streamChatReply } from '@/lib/contact/openai-chat'
import { getEnv } from '@/lib/contact/server-env'
import { signReply } from '@/lib/contact/session-token'
import { chatSecrets } from '../_secrets'

export const prerender = false

/** One chat turn. The body is `{ session, messages }` only: contact details are rejected by the schema. */
export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals)
  const secrets = chatSecrets(env)
  const { openai, session } = secrets
  if (!openai || !session) return errorResponse(503, GUARD_MESSAGES.chat_unavailable, { code: 'chat_unavailable' })

  const guarded = await guardChatRequest({
    request,
    env,
    schema: chatRequestSchema,
    purpose: 'chat',
    sessionSecret: session,
    typesafeApiKey: secrets.typesafe,
    now: Date.now(),
  })
  if (!guarded.ok) return guarded.response

  const userTurns = countUserTurns(guarded.messages)
  const abort = new AbortController()
  const deltas = streamChatReply(createOpenAIClient(openai), guarded.messages, {
    finalTurn: userTurns >= MAX_USER_TURNS,
    signal: abort.signal,
  })

  const closing = { readyForSummary: userTurns >= MIN_USER_TURNS_FOR_SUMMARY, sign: (reply: string) => signReply(session, reply) }
  const body = chatEventStream(deltas, closing, () => abort.abort())
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
