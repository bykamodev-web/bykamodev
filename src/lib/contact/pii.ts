/**
 * Contact details that can be recognised without a model. Runs in the browser before a
 * chat message leaves the page, and again on the Worker before anything reaches an AI.
 * A best-effort net, not a guarantee: unusual notations still get through.
 */

export type PiiKind = 'email' | 'phone'

// `@`, `(at)` or `[at]`, with optional spaces around it; domain labels may be non-ASCII.
const EMAIL = /[A-Za-z0-9._%+-]+\s*(?:@|\(at\)|\[at\])\s*[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}{2,}/iu

// 10–11 digit domestic numbers (0 + non-zero) or an international prefix, with short
// separators between digits. No lookbehind: Safari before 16.4 cannot parse one.
const SEPARATOR = String.raw`[-\s().\/‐-―−ー]{0,3}`
const PHONE = new RegExp(String.raw`(?:^|\D)(?:\+\d{1,3}${SEPARATOR}\d|0[1-9])(?:${SEPARATOR}\d){8,9}(?!\d)`)

const DETECTORS: ReadonlyArray<readonly [PiiKind, RegExp]> = [
  ['email', EMAIL],
  ['phone', PHONE],
]

/** NFKC folds full-width digits, ＠ and － into the ASCII forms the patterns expect. */
export function findPii(text: string): PiiKind[] {
  const normalized = text.normalize('NFKC')
  return DETECTORS.filter(([, pattern]) => pattern.test(normalized)).map(([kind]) => kind)
}

export const PII_LABELS: Readonly<Record<PiiKind, string>> = {
  email: 'メールアドレス',
  phone: '電話番号',
}
