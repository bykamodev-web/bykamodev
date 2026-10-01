import assert from 'node:assert/strict'
import test from 'node:test'
import { CHAT_MODEL, ChatUpstreamError, generateSummary, streamChatReply } from '../../src/lib/contact/openai-chat.ts'

const messages = [
  { role: 'user' as const, content: '請求書の処理を自動化したいです' },
  { role: 'assistant' as const, content: '月に何件ほどですか？' },
  { role: 'user' as const, content: '200件ほどです' },
]

type Params = Record<string, unknown>

const fakeClient = (reply: (params: Params) => unknown) => {
  const calls: Params[] = []
  return {
    calls,
    client: { responses: { create: async (params: Params) => { calls.push(params); return reply(params) } } },
  }
}

async function* events(...list: Array<Record<string, unknown>>) {
  for (const event of list) yield event
}

const collect = async (iterable: AsyncIterable<string>) => {
  const out: string[] = []
  for await (const chunk of iterable) out.push(chunk)
  return out
}

test('streamChatReply yields text deltas and asks for an unstored, low-effort streamed response', async () => {
  const { client, calls } = fakeClient(() =>
    events(
      { type: 'response.created' },
      { type: 'response.output_text.delta', delta: 'ありがとう' },
      { type: 'response.output_text.delta', delta: 'ございます' },
      { type: 'response.completed' },
    ),
  )

  assert.deepEqual(await collect(streamChatReply(client, messages, { finalTurn: false })), ['ありがとう', 'ございます'])

  const [params] = calls
  assert.equal(params.model, CHAT_MODEL)
  assert.equal(params.model, 'gpt-6.1-sol')
  assert.equal(params.store, false)
  assert.equal(params.stream, true)
  assert.deepEqual(params.reasoning, { effort: 'low' })
  assert.deepEqual(params.input, messages)
  assert.doesNotMatch(String(params.instructions), /これが最後の返答です/)
})

test('the final turn tells the model to close the conversation', async () => {
  const { client, calls } = fakeClient(() => events({ type: 'response.output_text.delta', delta: 'ok' }))
  await collect(streamChatReply(client, messages, { finalTurn: true }))
  assert.match(String(calls[0].instructions), /これが最後の返答です/)
})

test('streamChatReply throws on failure, refusal, and an empty truncated reply', async () => {
  const cases: Array<[string, Array<Record<string, unknown>>]> = [
    ['failed', [{ type: 'response.failed' }]],
    ['error', [{ type: 'error', message: 'boom' }]],
    ['refusal', [{ type: 'response.refusal.delta', delta: 'I cannot' }]],
    ['incomplete with no text', [{ type: 'response.incomplete' }]],
    ['no text at all', [{ type: 'response.completed' }]],
  ]
  for (const [label, list] of cases) {
    const { client } = fakeClient(() => events(...list))
    await assert.rejects(collect(streamChatReply(client, messages, { finalTurn: false })), ChatUpstreamError, label)
  }
})

test('a reply cut short after some text is kept as it is', async () => {
  const { client } = fakeClient(() => events({ type: 'response.output_text.delta', delta: '途中まで' }, { type: 'response.incomplete' }))
  assert.deepEqual(await collect(streamChatReply(client, messages, { finalTurn: false })), ['途中まで'])
})

test('generateSummary requests strict JSON and validates what comes back', async () => {
  const { client, calls } = fakeClient(() => ({ output_text: JSON.stringify({ category: 'automation', summary: '【背景】請求書処理が手作業。' }) }))

  assert.deepEqual(await generateSummary(client, messages), { category: 'automation', summary: '【背景】請求書処理が手作業。' })

  const [params] = calls
  const format = (params.text as { format: Record<string, unknown> }).format
  assert.equal(params.store, false)
  assert.equal(params.stream, undefined)
  assert.equal(format.type, 'json_schema')
  assert.equal(format.strict, true)
  assert.match(JSON.stringify(params.input), /\[相談者\] 請求書の処理を自動化したいです/)
})

test('generateSummary rejects unknown categories, broken JSON and empty output', async () => {
  for (const output_text of [JSON.stringify({ category: 'nope', summary: 'x' }), 'not json', '']) {
    const { client } = fakeClient(() => ({ output_text }))
    await assert.rejects(generateSummary(client, messages), ChatUpstreamError, output_text)
  }
})
