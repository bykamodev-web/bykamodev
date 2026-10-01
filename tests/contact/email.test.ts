import assert from 'node:assert/strict'
import test from 'node:test'
import { buildChatContactEmailBody, buildContactEmailBody, buildMimeMessage } from '../../src/lib/email.ts'

const decodeBody = (mime: string): string => {
  const encoded = mime.split('\r\n\r\n')[1].replace(/\r\n/g, '')
  return new TextDecoder().decode(Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)))
}

test('buildMimeMessage adds Reply-To only when given and strips header line breaks', () => {
  const plain = buildMimeMessage({ from: 'a@example.com', to: 'b@example.com', subject: '件名', body: '本文' })
  assert.doesNotMatch(plain, /^Reply-To:/m)

  const withReply = buildMimeMessage({
    from: 'a@example.com',
    to: 'b@example.com',
    subject: '件名',
    body: '本文',
    replyTo: 'visitor@example.com\r\nBcc: evil@example.com',
  })
  assert.match(withReply, /^Reply-To: visitor@example\.com Bcc: evil@example\.com$/m)
  assert.equal(withReply.split('\r\n').filter((line) => line.startsWith('Bcc:')).length, 0)
})

test('buildMimeMessage wraps the base64 body at 76 columns and round-trips UTF-8', () => {
  const body = '会話ログ\n'.repeat(200)
  const mime = buildMimeMessage({ from: 'a@example.com', to: 'b@example.com', subject: '件名', body })
  const bodyLines = mime.split('\r\n\r\n')[1].split('\r\n')

  assert.ok(bodyLines.length > 1)
  for (const line of bodyLines) assert.ok(line.length <= 76, `line length ${line.length}`)
  assert.equal(decodeBody(mime), body)
})

test('the form e-mail body keeps its existing layout', () => {
  const body = buildContactEmailBody({ name: '山田', email: 'a@example.com', categoryLabel: '自動化の相談', message: '本文です' })
  assert.match(body, /お名前: 山田/)
  assert.match(body, /--- お問い合わせ内容 ---\n\n本文です/)
})

test('the chat e-mail body lists the summary before the conversation log', () => {
  const body = buildChatContactEmailBody({
    name: '山田',
    email: 'a@example.com',
    categoryLabel: '自動化の相談',
    summary: '請求書処理を自動化したい。',
    greeting: 'こんにちは。',
    transcript: [
      { role: 'user', content: '請求書の処理を自動化したい' },
      { role: 'assistant', content: '月に何件ほどですか？' },
    ],
  })

  const summaryAt = body.indexOf('--- 要約 (ご本人確認済み) ---')
  const logAt = body.indexOf('--- 会話ログ ---')
  assert.ok(summaryAt > 0 && logAt > summaryAt)
  assert.match(body, /AIチャット経由/)
  assert.match(body, /\[AI\] こんにちは。\n\[相談者\] 請求書の処理を自動化したい\n\[AI\] 月に何件ほどですか？/)
})
