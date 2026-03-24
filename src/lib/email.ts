function sanitize(str: string): string {
  return str.replace(/[\r\n]/g, ' ').trim()
}

export function buildMimeMessage(options: {
  from: string
  to: string
  subject: string
  body: string
}): string {
  const { from, to, subject, body } = options

  return [
    `From: ${sanitize(from)}`,
    `To: ${sanitize(to)}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(sanitize(subject))))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    btoa(unescape(encodeURIComponent(body))),
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
