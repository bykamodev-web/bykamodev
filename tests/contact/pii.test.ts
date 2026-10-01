import assert from 'node:assert/strict'
import test from 'node:test'
import { findPii } from '../../src/lib/contact/pii.ts'

test('findPii detects e-mail addresses, including full-width at signs', () => {
  assert.deepEqual(findPii('連絡は taro@example.com までお願いします'), ['email'])
  assert.deepEqual(findPii('taro.yamada+work＠example.co.jp です'), ['email'])
  for (const text of ['taro @ example.com', 'taro(at)example.com', 'taro [at] example.com', 'taro@例え.jp']) {
    assert.deepEqual(findPii(text), ['email'], text)
  }
})

test('findPii detects Japanese phone numbers in common notations', () => {
  for (const text of [
    '電話は 03-1234-5678 です',
    '090-1234-5678',
    '09012345678 にかけてください',
    '０９０－１２３４－５６７８',
    '+81 90 1234 5678',
    '+81-3-1234-5678',
    '0120-123-456',
    '03 (1234) 5678',
    '090/1234/5678',
    '090 - 1234 - 5678',
    '+1 415 555 2671',
    'tel:09012345678',
  ]) {
    assert.deepEqual(findPii(text), ['phone'], text)
  }
})

test('findPii reports each kind once when both appear', () => {
  assert.deepEqual(findPii('a@example.com / 090-1234-5678 / b@example.com'), ['email', 'phone'])
})

test('findPii leaves ordinary consultation text alone', () => {
  for (const text of [
    '2026年10月までにリリースしたいです',
    '予算300万円くらいを考えています',
    '10-20人のチームで使います',
    '営業時間は09:00-18:00です',
    '月に100000000件のログを処理しています',
    '2026-10-01 に公開予定',
    'バージョン 0.9.12 を使っています',
    '@つきのメンションを自動で拾いたい',
    '見積 No.0012345678 の件です',
    '1日あたり 0.5 人月 × 12 か月 = 6 人月',
  ]) {
    assert.deepEqual(findPii(text), [], text)
  }
})

test('the patterns avoid lookbehind, which old Safari cannot parse', async () => {
  const { readFile } = await import('node:fs/promises')
  const source = await readFile(new URL('../../src/lib/contact/pii.ts', import.meta.url), 'utf8')
  const code = source.split('\n').filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*')).join('\n')
  assert.doesNotMatch(code, /\(\?<[!=]/)
})
