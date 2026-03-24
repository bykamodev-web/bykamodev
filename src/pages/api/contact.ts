import type { APIRoute } from 'astro'
import { EmailMessage } from 'cloudflare:email'
import { contactFormSchema, getCategoryLabel } from '@/lib/contact-schema'
import { buildMimeMessage, buildContactEmailBody } from '@/lib/email'

export const prerender = false

const FROM_ADDRESS = 'noreply@bykamo.dev'
const TO_ADDRESS = 'hello@bykamo.dev'
const MIN_SUBMIT_MS = 3000
const MAX_SUBMIT_MS = 60 * 60 * 1000

function getEnv(locals: App.Locals): Record<string, unknown> {
  const l = locals as unknown as Record<string, unknown>
  if (l.runtime && typeof l.runtime === 'object') {
    const rt = l.runtime as Record<string, unknown>
    if (rt.env && typeof rt.env === 'object') return rt.env as Record<string, unknown>
  }
  return l
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals)

  const contentType = request.headers.get('content-type')
  if (!contentType?.includes('application/json')) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid content type' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid JSON' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const result = contactFormSchema.safeParse(body)
  if (!result.success) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'バリデーションエラー',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const data = result.data

  const elapsed = Date.now() - data._timestamp
  if (elapsed < MIN_SUBMIT_MS || elapsed > MAX_SUBMIT_MS) {
    return new Response(
      JSON.stringify({ success: false, error: 'Request rejected' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const turnstileSecret = (env.TURNSTILE_SECRET_KEY as string) || import.meta.env.TURNSTILE_SECRET_KEY
  if (!turnstileSecret) {
    console.error('TURNSTILE_SECRET_KEY not found. env keys:', Object.keys(env))
    return new Response(
      JSON.stringify({ success: false, error: 'Server configuration error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: turnstileSecret,
      response: data._turnstile,
    }),
  })
  const turnstileData = await turnstileRes.json() as { success: boolean; 'error-codes'?: string[] }
  if (!turnstileData.success) {
    console.error('Turnstile verification failed:', turnstileData)
    return new Response(
      JSON.stringify({ success: false, error: '認証に失敗しました。ページを再読み込みしてお試しください。' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const categoryLabel = getCategoryLabel(data.category)
  const emailBody = buildContactEmailBody({
    name: data.name,
    email: data.email,
    categoryLabel,
    message: data.message,
  })

  const mimeContent = buildMimeMessage({
    from: FROM_ADDRESS,
    to: TO_ADDRESS,
    subject: `[bykamo.dev] ${categoryLabel} - ${data.name}`,
    body: emailBody,
  })

  try {
    const msg = new EmailMessage(FROM_ADDRESS, TO_ADDRESS, new TextEncoder().encode(mimeContent))
    const emailBinding = env.EMAIL as { send: (msg: EmailMessage) => Promise<void> }
    await emailBinding.send(msg)
  } catch (error) {
    console.error('Email send failed:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'メッセージの送信に失敗しました。時間をおいて再度お試しください。' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}
