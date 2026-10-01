const BASE64_LINE_LENGTH = 76

function sanitize(str: string): string {
  return str.replace(/[\r\n]+/g, ' ').trim()
}

/** `encodeURIComponent` throws on a lone surrogate, so those become U+FFFD first. */
function toWellFormed(str: string): string {
  return str.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '\uFFFD')
}

function toBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(toWellFormed(str))))
}

/** RFC 2045 caps encoded lines at 76 characters; a chat log easily exceeds one line. */
function wrapBase64(encoded: string): string {
  return encoded.match(new RegExp(`.{1,${BASE64_LINE_LENGTH}}`, 'g'))?.join('\r\n') ?? ''
}

export function buildMimeMessage(options: {
  from: string
  to: string
  subject: string
  body: string
  replyTo?: string
}): string {
  const { from, to, subject, body, replyTo } = options

  return [
    `From: ${sanitize(from)}`,
    `To: ${sanitize(to)}`,
    ...(replyTo ? [`Reply-To: ${sanitize(replyTo)}`] : []),
    `Subject: =?UTF-8?B?${toBase64(sanitize(subject))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(toBase64(body)),
  ].join('\r\n')
}

export function buildContactEmailBody(options: {
  name: string
  email: string
  categoryLabel: string
  message: string
}): string {
  return [
    `【bykamo.dev】お問い合わせ`,
    '',
    `お名前: ${options.name}`,
    `メールアドレス: ${options.email}`,
    `ご相談の種類: ${options.categoryLabel}`,
    '',
    `--- お問い合わせ内容 ---`,
    '',
    options.message,
    '',
    `---`,
    `送信元: bykamo.dev contact form`,
  ].join('\n')
}

const SPEAKER = { user: '相談者', assistant: 'AI' } as const
const CONTINUATION = '\n    '

/** Later lines of a message are indented, so typed text can never pose as a new `[AI]` line. */
function logLine(role: 'user' | 'assistant', content: string): string {
  return `[${SPEAKER[role]}] ${content.replace(/\r?\n/g, CONTINUATION)}`
}

export function buildChatContactEmailBody(options: {
  name: string
  email: string
  categoryLabel: string
  summary: string
  greeting: string
  transcript: ReadonlyArray<{ role: 'user' | 'assistant'; content: string }>
}): string {
  const log = [logLine('assistant', options.greeting), ...options.transcript.map((m) => logLine(m.role, m.content))]

  return [
    `【bykamo.dev】お問い合わせ (AIチャット経由)`,
    '',
    `お名前: ${options.name}`,
    `メールアドレス: ${options.email}`,
    `ご相談の種類: ${options.categoryLabel}`,
    '',
    `--- 要約 (ご本人確認済み) ---`,
    '',
    options.summary,
    '',
    `--- 会話ログ ---`,
    '',
    log.join('\n'),
    '',
    `---`,
    `送信元: bykamo.dev contact form (chat)`,
  ].join('\n')
}
