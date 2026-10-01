import assert from 'node:assert/strict'
import test from 'node:test'
import { z } from 'zod'
import { clientIp, clientKey, errorResponse, jsonResponse, readJsonBody, zodDetails } from '../../src/lib/contact/http.ts'
import { checkRateLimit } from '../../src/lib/contact/rate-limit.ts'
import { getEnv, getSecret } from '../../src/lib/contact/server-env.ts'
import { verifyTurnstile } from '../../src/lib/contact/turnstile.ts'

const jsonRequest = (body: string, contentType = 'application/json') =>
  new Request('https://bykamo.dev/api/chat', { method: 'POST', headers: { 'content-type': contentType }, body })

test('jsonResponse and errorResponse use the shared envelope', async () => {
  const ok = jsonResponse({ success: true }, 200)
  assert.equal(ok.headers.get('content-type'), 'application/json')
  assert.equal(ok.headers.get('cache-control'), 'no-store')

  const failed = errorResponse(422, '入力を確認してください', { code: 'pii_detected', details: [{ field: 'messages.0.content', message: 'x' }] })
  assert.equal(failed.status, 422)
  assert.deepEqual(await failed.json(), {
    success: false,
    error: '入力を確認してください',
    code: 'pii_detected',
    details: [{ field: 'messages.0.content', message: 'x' }],
  })
})

test('readJsonBody rejects other content types and broken JSON', async () => {
  const good = await readJsonBody(jsonRequest('{"a":1}'))
  assert.deepEqual(good, { ok: true, body: { a: 1 } })

  const wrongType = await readJsonBody(jsonRequest('{"a":1}', 'text/plain'))
  assert.equal(wrongType.ok, false)
  assert.equal(!wrongType.ok && wrongType.response.status, 400)

  const broken = await readJsonBody(jsonRequest('{'))
  assert.equal(broken.ok, false)
})

test('zodDetails flattens issues into field/message pairs', () => {
  const result = z.object({ a: z.object({ b: z.string() }) }).safeParse({ a: { b: 1 } })
  assert.equal(result.success, false)
  if (!result.success) assert.equal(zodDetails(result.error)[0].field, 'a.b')
})

test('clientIp reads the Cloudflare header and falls back to a constant', () => {
  const withHeader = new Request('https://bykamo.dev/', { headers: { 'CF-Connecting-IP': '203.0.113.7' } })
  assert.equal(clientIp(withHeader), '203.0.113.7')
  assert.equal(clientIp(new Request('https://bykamo.dev/')), 'unknown')
})

test('clientKey groups an IPv6 /64 and leaves IPv4 alone', () => {
  const from = (ip: string) => new Request('https://bykamo.dev/', { headers: { 'CF-Connecting-IP': ip } })
  assert.equal(clientKey(from('203.0.113.7')), '203.0.113.7')
  assert.equal(clientKey(from('2001:db8:1234:5678:aaaa:bbbb:cccc:dddd')), '2001:db8:1234:5678')
  assert.equal(clientKey(from('2001:db8:1234:5678:1111:2222:3333:4444')), '2001:db8:1234:5678')
  assert.notEqual(clientKey(from('2001:db8:1234:9999::1')), '2001:db8:1234:5678')
})

test('checkRateLimit passes when the binding is missing and follows the binding otherwise', async () => {
  const keys: string[] = []
  const limiter = (success: boolean) => ({ limit: async ({ key }: { key: string }) => { keys.push(key); return { success } } })

  assert.equal(await checkRateLimit(undefined, 'k'), true)
  assert.equal(await checkRateLimit(limiter(true), 'a'), true)
  assert.equal(await checkRateLimit(limiter(false), 'b'), false)
  assert.deepEqual(keys, ['a', 'b'])
  assert.equal(await checkRateLimit({ limit: async () => { throw new Error('down') } }, 'c'), true)
})

test('getEnv unwraps the Cloudflare runtime and getSecret prefers it over the fallback', () => {
  const env = getEnv({ runtime: { env: { OPENAI_API_KEY: 'runtime' } } })
  assert.equal(getSecret(env, 'OPENAI_API_KEY', 'fallback'), 'runtime')
  assert.equal(getSecret(env, 'MISSING', 'fallback'), 'fallback')
  assert.equal(getSecret(env, 'MISSING'), undefined)
  assert.deepEqual(getEnv({ plain: true }), { plain: true })
})

test('verifyTurnstile posts the secret, token and IP and reports the verdict', async () => {
  const calls: Array<{ url: string; body: string }> = []
  const fetchImpl = (success: boolean) => async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: String(init?.body) })
    return new Response(JSON.stringify({ success, 'error-codes': success ? [] : ['timeout-or-duplicate'] }))
  }

  const passed = await verifyTurnstile({ secret: 's', token: 't', remoteIp: '203.0.113.7', fetchImpl: fetchImpl(true) as typeof fetch })
  assert.deepEqual(passed, { ok: true, errorCodes: [] })
  assert.match(calls[0].url, /turnstile\/v0\/siteverify$/)
  assert.match(calls[0].body, /secret=s&response=t&remoteip=203\.0\.113\.7/)

  const failed = await verifyTurnstile({ secret: 's', token: 't', fetchImpl: fetchImpl(false) as typeof fetch })
  assert.deepEqual(failed, { ok: false, errorCodes: ['timeout-or-duplicate'] })
  assert.doesNotMatch(calls[1].body, /remoteip/)

  const down = await verifyTurnstile({ secret: 's', token: 't', fetchImpl: (async () => { throw new Error('network') }) as typeof fetch })
  assert.deepEqual(down, { ok: false, errorCodes: ['siteverify-unreachable'] })
})
