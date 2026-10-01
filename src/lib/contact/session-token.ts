import { SESSION_TTL_MS } from './limits.ts'

/**
 * Stateless chat session: `v1.<payload>.<HMAC-SHA256>`. Issued once Turnstile passes,
 * so later chat turns need no new challenge and the Worker keeps no session store.
 */

const VERSION = 'v1'
const encoder = new TextEncoder()

type Payload = { sid: string; iat: number; exp: number }

export type SessionVerdict = { ok: true; sid: string; expiresAt: number } | { ok: false }

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

function isPayload(value: unknown): value is Payload {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.sid === 'string' && typeof v.iat === 'number' && typeof v.exp === 'number'
}

export async function issueSessionToken(
  secret: string,
  now: number,
  ttlMs: number = SESSION_TTL_MS,
): Promise<{ token: string; sid: string; expiresAt: number }> {
  const payload: Payload = { sid: crypto.randomUUID(), iat: now, exp: now + ttlMs }
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)))
  const signature = await crypto.subtle.sign('HMAC', await importKey(secret), encoder.encode(`${VERSION}.${body}`))

  return { token: `${VERSION}.${body}.${toBase64Url(new Uint8Array(signature))}`, sid: payload.sid, expiresAt: payload.exp }
}

export async function verifySessionToken(token: string, secret: string, now: number): Promise<SessionVerdict> {
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== VERSION) return { ok: false }
  const [, body, signature] = parts

  try {
    const valid = await crypto.subtle.verify('HMAC', await importKey(secret), fromBase64Url(signature), encoder.encode(`${VERSION}.${body}`))
    if (!valid) return { ok: false }

    const payload: unknown = JSON.parse(new TextDecoder().decode(fromBase64Url(body)))
    if (!isPayload(payload) || payload.exp <= now) return { ok: false }

    return { ok: true, sid: payload.sid, expiresAt: payload.exp }
  } catch {
    // Not base64url or not JSON: an invalid token, not a server fault.
    return { ok: false }
  }
}
