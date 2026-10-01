import type { APIRoute } from 'astro'
import { contactPayloadSchema, getCategoryLabel, type ContactPayload } from '@/lib/contact-schema'
import { buildChatContactEmailBody, buildContactEmailBody, buildMimeMessage } from '@/lib/email'
import { GREETING } from '@/lib/contact/greeting'
import { clientIp, errorResponse, jsonResponse, readJsonBody, zodDetails } from '@/lib/contact/http'
import { checkRateLimit, type RateLimiter } from '@/lib/contact/rate-limit'
import { FROM_ADDRESS, TO_ADDRESS, sendContactEmail } from '@/lib/contact/send-contact-email'
import { getEnv } from '@/lib/contact/server-env'
import { verifyTurnstile } from '@/lib/contact/turnstile'
import { turnstileSecret } from './_secrets'

export const prerender = false

const MIN_SUBMIT_MS = 3000
const MAX_SUBMIT_MS = 60 * 60 * 1000

/** The owner's inbox is the only destination: this route never calls an AI. */
function buildEmail(data: ContactPayload): { subject: string; body: string } {
  const categoryLabel = getCategoryLabel(data.category)
  const subject = `[bykamo.dev] ${categoryLabel} - ${data.name}`

  if (data.mode === 'chat') {
    return {
      subject: `${subject} (AIチャット)`,
      body: buildChatContactEmailBody({
        name: data.name,
        email: data.email,
        categoryLabel,
        summary: data.summary,
        greeting: GREETING,
        transcript: data.transcript,
      }),
    }
  }

  return {
    subject,
    body: buildContactEmailBody({ name: data.name, email: data.email, categoryLabel, message: data.message }),
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals)

  const parsed = await readJsonBody(request)
  if (!parsed.ok) return parsed.response

  const result = contactPayloadSchema.safeParse(parsed.body)
  if (!result.success) {
    return errorResponse(400, 'バリデーションエラー', { details: zodDetails(result.error) })
  }
  const data = result.data

  const elapsed = Date.now() - data._timestamp
  if (elapsed < MIN_SUBMIT_MS || elapsed > MAX_SUBMIT_MS) {
    return errorResponse(400, 'Request rejected')
  }

  const ip = clientIp(request)
  if (!(await checkRateLimit(env.RL_SUBMIT_IP as RateLimiter | undefined, `submit:${ip}`))) {
    return errorResponse(429, '送信が続いています。1分ほど待ってからお試しください。', {
      code: 'rate_limited',
      headers: { 'Retry-After': '60' },
    })
  }

  const secret = turnstileSecret(env)
  if (!secret) return errorResponse(500, 'Server configuration error')

  const verdict = await verifyTurnstile({ secret, token: data._turnstile, remoteIp: ip })
  if (!verdict.ok) {
    return errorResponse(403, '認証に失敗しました。もう一度お試しください。', { code: 'turnstile_failed' })
  }

  const { subject, body } = buildEmail(data)
  const mimeContent = buildMimeMessage({ from: FROM_ADDRESS, to: TO_ADDRESS, replyTo: data.email, subject, body })

  try {
    await sendContactEmail(env, mimeContent)
  } catch (error) {
    console.error('Email send failed:', error)
    return errorResponse(500, 'メッセージの送信に失敗しました。時間をおいて再度お試しください。')
  }

  return jsonResponse({ success: true }, 200)
}
