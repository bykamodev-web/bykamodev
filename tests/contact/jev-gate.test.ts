import assert from 'node:assert/strict'
import test from 'node:test'
import { buildJevRequest, decideGate, runJevGate } from '../../src/lib/contact/jev-gate.ts'
import { JEV_THRESHOLDS } from '../../src/lib/contact/limits.ts'

const messages = [
  { role: 'user' as const, content: '請求書の処理を自動化したいです' },
  { role: 'assistant' as const, content: 'いつ頃までに必要ですか？' },
  { role: 'user' as const, content: '来月です' },
]

const answers = (values: Partial<Record<keyof typeof JEV_THRESHOLDS, number>>) => ({
  answers: Object.fromEntries(
    Object.entries({ person_name: 0, postal_address: 0, off_topic: 0, jailbreak: 0, ...values }).map(([id, noul]) => [id, { type: 'noul', noul }]),
  ),
})

const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

test('buildJevRequest keys the questions by id and gives the latest message its context', () => {
  const request = buildJevRequest(messages, 'chat')

  assert.equal(request.model, 'jev-latest')
  assert.equal(Array.isArray(request.questions), false)
  assert.deepEqual(Object.keys(request.questions).sort(), ['jailbreak', 'off_topic', 'person_name', 'postal_address'])
  for (const question of Object.values(request.questions)) assert.equal(question.type, 'noul')
  assert.equal(request.state.latest_user_message, '来月です')
  assert.equal(request.state.previous_assistant_message, 'いつ頃までに必要ですか？')
  assert.equal(request.state.conversation.length, 3)
})

test('the summary gate only asks about the conversation as a whole', () => {
  const request = buildJevRequest(messages, 'summary')
  assert.deepEqual(Object.keys(request.questions).sort(), ['jailbreak', 'off_topic'])
})

test('decideGate blocks at the threshold and passes just below it', () => {
  assert.deepEqual(decideGate(answers({}).answers), { allow: true })
  assert.deepEqual(decideGate(answers({ person_name: JEV_THRESHOLDS.person_name }).answers), { allow: false, reason: 'pii_suspected' })
  assert.deepEqual(decideGate(answers({ person_name: JEV_THRESHOLDS.person_name - 0.01 }).answers), { allow: true })
  assert.deepEqual(decideGate(answers({ postal_address: 0.95 }).answers), { allow: false, reason: 'pii_suspected' })
  assert.deepEqual(decideGate(answers({ off_topic: JEV_THRESHOLDS.off_topic }).answers), { allow: false, reason: 'off_topic' })
  assert.deepEqual(decideGate(answers({ jailbreak: 0.99 }).answers), { allow: false, reason: 'off_topic' })
})

test('decideGate reports personal information first and ignores malformed answers', () => {
  assert.deepEqual(decideGate(answers({ person_name: 0.9, off_topic: 0.9 }).answers), { allow: false, reason: 'pii_suspected' })
  assert.deepEqual(decideGate({ person_name: { type: 'noul' }, off_topic: 'nope' }), { allow: true })
  assert.deepEqual(decideGate(undefined), { allow: true })
})

test('runJevGate sends the bearer key and applies the decision', async () => {
  const calls: Array<{ url: string; init: RequestInit }> = []
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    return respond(answers({ off_topic: 0.92 }))
  }) as unknown as typeof fetch

  const verdict = await runJevGate({ apiKey: 'key', messages, purpose: 'chat', fetchImpl })

  assert.deepEqual(verdict, { allow: false, reason: 'off_topic' })
  assert.equal(calls[0].url, 'https://api.typesafe.ai/v1/systemone')
  assert.equal((calls[0].init.headers as Record<string, string>).Authorization, 'Bearer key')
  assert.equal(JSON.parse(String(calls[0].init.body)).model, 'jev-latest')
})

test('runJevGate retries once on 429/529 and then follows the answer', async () => {
  let attempts = 0
  const fetchImpl = (async () => {
    attempts += 1
    return attempts === 1 ? respond({}, 529) : respond(answers({ person_name: 0.9 }))
  }) as unknown as typeof fetch

  const verdict = await runJevGate({ apiKey: 'key', messages, purpose: 'chat', fetchImpl, retryDelayMs: 0 })
  assert.equal(attempts, 2)
  assert.deepEqual(verdict, { allow: false, reason: 'pii_suspected' })
})

test('runJevGate fails open when the key is missing or the service misbehaves', async () => {
  const failing: Array<[string, typeof fetch]> = [
    ['http 500', (async () => respond({}, 500)) as unknown as typeof fetch],
    ['still overloaded', (async () => respond({}, 429)) as unknown as typeof fetch],
    ['network error', (async () => { throw new Error('network') }) as unknown as typeof fetch],
    ['not json', (async () => new Response('<html>')) as unknown as typeof fetch],
    ['timeout', ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new Error('aborted'))))) as unknown as typeof fetch],
  ]

  for (const [label, fetchImpl] of failing) {
    const verdict = await runJevGate({ apiKey: 'key', messages, purpose: 'chat', fetchImpl, retryDelayMs: 0, timeoutMs: 20 })
    assert.deepEqual(verdict, { allow: true }, label)
  }

  let called = false
  const never = (async () => { called = true; return respond({}) }) as unknown as typeof fetch
  assert.deepEqual(await runJevGate({ apiKey: undefined, messages, purpose: 'chat', fetchImpl: never }), { allow: true })
  assert.equal(called, false)
})
