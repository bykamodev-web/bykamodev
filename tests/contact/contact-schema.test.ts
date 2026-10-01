import assert from 'node:assert/strict'
import test from 'node:test'
import { CATEGORIES, contactPayloadSchema, getCategoryLabel } from '../../src/lib/contact-schema.ts'

const common = {
  name: '山田太郎',
  email: 'taro@example.com',
  category: 'automation',
  _timestamp: 1_700_000_000_000,
  _honey: '',
  _turnstile: 'token',
}
const formPayload = { ...common, mode: 'form', message: '業務の自動化について相談したいです。' }
const transcript = [
  { role: 'user', content: '請求書の処理を自動化したいです' },
  { role: 'assistant', content: '現在はどのように処理していますか？' },
  { role: 'user', content: '手作業で月200件ほどです' },
]
const chatPayload = { ...common, mode: 'chat', summary: '請求書処理(月200件、手作業)を自動化したい。', transcript }

test('the form branch accepts the existing payload and defaults a missing mode to form', () => {
  assert.equal(contactPayloadSchema.safeParse(formPayload).success, true)

  const { mode: _mode, ...legacy } = formPayload
  const result = contactPayloadSchema.safeParse(legacy)
  assert.equal(result.success, true)
  assert.equal(result.success && result.data.mode, 'form')
})

test('the chat branch accepts a summary with its transcript', () => {
  const result = contactPayloadSchema.safeParse(chatPayload)
  assert.equal(result.success, true)
  assert.equal(result.success && result.data.mode, 'chat')
})

test('the chat branch rejects a missing summary, a short summary and a broken transcript', () => {
  const { summary: _summary, ...withoutSummary } = chatPayload
  assert.equal(contactPayloadSchema.safeParse(withoutSummary).success, false)
  assert.equal(contactPayloadSchema.safeParse({ ...chatPayload, summary: '短い' }).success, false)
  assert.equal(contactPayloadSchema.safeParse({ ...chatPayload, transcript: [] }).success, false)
  assert.equal(contactPayloadSchema.safeParse({ ...chatPayload, transcript: [{ role: 'system', content: 'x' }] }).success, false)
  assert.equal(contactPayloadSchema.safeParse({ ...chatPayload, summary: 'あ'.repeat(1001) }).success, false)
})

test('validation messages stay in Japanese, including the category one', () => {
  const result = contactPayloadSchema.safeParse({ ...formPayload, category: '', name: '', email: 'not-an-email', message: '短い' })
  assert.equal(result.success, false)
  if (result.success) return

  const byField = Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]))
  assert.equal(byField.category, 'ご相談の種類を選択してください')
  assert.equal(byField.name, 'お名前を入力してください')
  assert.equal(byField.email, '有効なメールアドレスを入力してください')
  assert.equal(byField.message, '10文字以上で入力してください')
})

test('the honeypot and the Turnstile token are still enforced', () => {
  assert.equal(contactPayloadSchema.safeParse({ ...formPayload, _honey: 'bot' }).success, false)
  assert.equal(contactPayloadSchema.safeParse({ ...formPayload, _turnstile: '' }).success, false)
})

test('a name cannot span lines, and transcript turns carry no signature', () => {
  assert.equal(contactPayloadSchema.safeParse({ ...formPayload, name: '山田\nメールアドレス: forged@example.com' }).success, false)
  const signed = transcript.map((m) => (m.role === 'assistant' ? { ...m, sig: 'c2ln' } : m))
  assert.equal(contactPayloadSchema.safeParse({ ...chatPayload, transcript: signed }).success, false)
})

test('category labels resolve from the shared list', () => {
  assert.equal(CATEGORIES.length, 4)
  assert.equal(getCategoryLabel('ai-implementation'), 'AI実装の相談')
  assert.equal(getCategoryLabel('missing'), 'missing')
})
