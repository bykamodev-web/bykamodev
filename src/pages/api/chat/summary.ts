import type { APIRoute } from 'astro'
import { GUARD_MESSAGES, guardChatRequest } from '@/lib/contact/chat-guard'
import { summaryRequestSchema } from '@/lib/contact/chat-schema'
import { errorResponse, jsonResponse } from '@/lib/contact/http'
import { createOpenAIClient, generateSummary } from '@/lib/contact/openai-chat'
import { getEnv } from '@/lib/contact/server-env'
import { chatSecrets } from '../_secrets'

export const prerender = false

/** Drafts the summary and category the visitor reviews before sending. */
export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals)
  const secrets = chatSecrets(env)
  if (!secrets.openai) return errorResponse(503, GUARD_MESSAGES.chat_unavailable, { code: 'chat_unavailable' })

  const guarded = await guardChatRequest({
    request,
    env,
    schema: summaryRequestSchema,
    purpose: 'summary',
    sessionSecret: secrets.session,
    typesafeApiKey: secrets.typesafe,
    now: Date.now(),
  })
  if (!guarded.ok) return guarded.response

  try {
    const summary = await generateSummary(createOpenAIClient(secrets.openai), guarded.messages)
    return jsonResponse({ success: true, ...summary }, 200)
  } catch (error) {
    console.error('Summary generation failed:', error)
    return errorResponse(502, '要約を作成できませんでした。下の欄に直接ご記入ください。', { code: 'summary_failed' })
  }
}
