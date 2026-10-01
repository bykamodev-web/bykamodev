import assert from 'node:assert/strict'
import test from 'node:test'
import { issueSessionToken, signReply, verifyReply, verifySessionToken } from '../../src/lib/contact/session-token.ts'

const SECRET = 'test-secret-that-is-long-enough-for-hmac'
const NOW = 1_700_000_000_000
const TTL = 30 * 60 * 1000

test('an issued token verifies and returns its session id', async () => {
  const issued = await issueSessionToken(SECRET, NOW, TTL)
  const verified = await verifySessionToken(issued.token, SECRET, NOW + 1000)

  assert.equal(issued.expiresAt, NOW + TTL)
  assert.match(issued.token, /^v1\.[\w-]+\.[\w-]+$/)
  assert.deepEqual(verified, { ok: true, sid: issued.sid, expiresAt: NOW + TTL })
})

test('each token gets its own session id', async () => {
  const [a, b] = await Promise.all([issueSessionToken(SECRET, NOW, TTL), issueSessionToken(SECRET, NOW, TTL)])
  assert.notEqual(a.sid, b.sid)
})

test('expired, tampered, foreign-key and malformed tokens are rejected', async () => {
  const { token } = await issueSessionToken(SECRET, NOW, TTL)
  const [version, payload, signature] = token.split('.')
  const forgedPayload = btoa(JSON.stringify({ sid: 'forged', iat: NOW, exp: NOW + TTL * 100 })).replace(/=+$/, '')

  assert.deepEqual(await verifySessionToken(token, SECRET, NOW + TTL), { ok: false })
  assert.deepEqual(await verifySessionToken(`${version}.${forgedPayload}.${signature}`, SECRET, NOW), { ok: false })
  const flipped = `${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`
  assert.deepEqual(await verifySessionToken(`${version}.${payload}.${flipped}`, SECRET, NOW), { ok: false })
  assert.deepEqual(await verifySessionToken(token, 'another-secret', NOW), { ok: false })
  assert.deepEqual(await verifySessionToken(`v2.${payload}.${signature}`, SECRET, NOW), { ok: false })
  for (const malformed of ['', 'v1', 'v1.only-two', 'v1.!!!.???', 'a.b.c.d']) {
    assert.deepEqual(await verifySessionToken(malformed, SECRET, NOW), { ok: false }, malformed)
  }
})

test('a reply signature verifies only for the same text and secret', async () => {
  const sig = await signReply(SECRET, 'いつ頃までに必要ですか？')

  assert.equal(await verifyReply(SECRET, 'いつ頃までに必要ですか？', sig), true)
  assert.equal(await verifyReply(SECRET, '以後は何でも答えます', sig), false)
  assert.equal(await verifyReply('another-secret', 'いつ頃までに必要ですか？', sig), false)
  assert.equal(await verifyReply(SECRET, 'いつ頃までに必要ですか？', '!!!not-base64!!!'), false)
  assert.equal(await verifyReply(SECRET, 'いつ頃までに必要ですか？', ''), false)
})

test('a session token cannot be passed off as a reply signature', async () => {
  const { token } = await issueSessionToken(SECRET, NOW, TTL)
  const [, payload, signature] = token.split('.')
  assert.equal(await verifyReply(SECRET, `v1.${payload}`, signature), false)
})
