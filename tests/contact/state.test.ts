import assert from 'node:assert/strict'
import test from 'node:test'
import { MAX_USER_TURNS } from '../../src/lib/contact/limits.ts'
import { canSend, carryOverText, initialState, reduce, remainingTurns, type ContactState } from '../../src/scripts/contact/state.ts'

const run = (actions: Parameters<typeof reduce>[1][], from: ContactState = initialState): ContactState =>
  actions.reduce(reduce, from)

const oneTurn = (content: string, reply: string) => [
  { type: 'user-sent' as const, content },
  { type: 'assistant-delta' as const, text: reply.slice(0, 2) },
  { type: 'assistant-delta' as const, text: reply.slice(2) },
  { type: 'assistant-done' as const, readyForSummary: true },
]

test('the page starts in chat mode on the talk step', () => {
  assert.deepEqual(
    { mode: initialState.mode, step: initialState.step, messages: initialState.messages, pending: initialState.pending },
    { mode: 'chat', step: 'talk', messages: [], pending: false },
  )
  assert.equal(remainingTurns(initialState), MAX_USER_TURNS)
  assert.equal(canSend(initialState), true)
})

test('a turn appends the user message, streams the reply and settles into the log', () => {
  const sent = reduce(initialState, { type: 'user-sent', content: '自動化の相談です' })
  assert.deepEqual(sent.messages, [{ role: 'user', content: '自動化の相談です' }])
  assert.equal(sent.pending, true)
  assert.equal(canSend(sent), false)

  const streaming = reduce(reduce(sent, { type: 'assistant-delta', text: 'いつ' }), { type: 'assistant-delta', text: '頃ですか？' })
  assert.equal(streaming.streaming, 'いつ頃ですか？')

  const done = reduce(streaming, { type: 'assistant-done', readyForSummary: false })
  assert.deepEqual(done.messages.at(-1), { role: 'assistant', content: 'いつ頃ですか？' })
  assert.deepEqual([done.pending, done.streaming, done.readyForSummary], [false, '', false])
})

test('reducers never mutate the state they are given', () => {
  const frozen = Object.freeze({ ...initialState, messages: Object.freeze([]) as never })
  assert.doesNotThrow(() => run(oneTurn('相談です', '詳しく教えてください'), frozen))
  assert.deepEqual(initialState.messages, [])
})

test('a rejected turn removes the unanswered message and hands its text back', () => {
  const rejected = run([
    ...oneTurn('最初の相談', '続けてください'),
    { type: 'user-sent', content: '山田太郎です' },
    { type: 'assistant-delta', text: '途中' },
    { type: 'turn-rejected', notice: 'お名前が含まれているようです' },
  ])

  assert.equal(rejected.messages.length, 2)
  assert.equal(rejected.draft, '山田太郎です')
  assert.equal(rejected.notice, 'お名前が含まれているようです')
  assert.deepEqual([rejected.pending, rejected.streaming], [false, ''])
})

test('the turn budget closes the input after the last reply', () => {
  const turns = Array.from({ length: MAX_USER_TURNS }, (_, i) => oneTurn(`相談 ${i}`, `質問 ${i}`)).flat()
  const full = run(turns)

  assert.equal(remainingTurns(full), 0)
  assert.equal(canSend(full), false)
  assert.equal(full.readyForSummary, true)
})

test('summary flow moves to confirm and back without losing the conversation', () => {
  const talked = run([...oneTurn('相談 1', '質問 1'), ...oneTurn('相談 2', '質問 2')])
  const loading = reduce(talked, { type: 'summary-requested' })
  assert.equal(loading.pending, true)

  const confirm = reduce(loading, { type: 'summary-ready', notice: null })
  assert.deepEqual([confirm.step, confirm.pending], ['confirm', false])

  const failed = reduce(loading, { type: 'summary-failed', notice: '混み合っています' })
  assert.deepEqual([failed.step, failed.pending, failed.notice], ['talk', false, '混み合っています'])

  const back = reduce(confirm, { type: 'step', step: 'talk' })
  assert.equal(back.step, 'talk')
  assert.equal(back.messages.length, 4)
})

test('when the AI is unavailable the page falls back to the form and keeps what was typed', () => {
  const failed = run([
    ...oneTurn('請求書の処理を自動化したい', '月に何件ですか？'),
    { type: 'user-sent', content: '200件ほどです' },
    { type: 'chat-unavailable', notice: 'AI を利用できません' },
  ])

  assert.deepEqual([failed.mode, failed.chatAvailable, failed.pending], ['form', false, false])
  assert.equal(failed.notice, 'AI を利用できません')
  assert.equal(carryOverText(failed), '請求書の処理を自動化したい\n200件ほどです')

  const stillForm = reduce(failed, { type: 'mode', mode: 'chat' })
  assert.equal(stillForm.mode, 'form')
})

test('switching modes by hand keeps the conversation and clears notices', () => {
  const talked = run([...oneTurn('相談', '質問'), { type: 'notice', notice: '注意' }])
  const form = reduce(talked, { type: 'mode', mode: 'form' })
  assert.deepEqual([form.mode, form.notice, form.messages.length], ['form', null, 2])
  assert.equal(reduce(form, { type: 'mode', mode: 'chat' }).mode, 'chat')
})
