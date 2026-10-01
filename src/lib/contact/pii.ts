/**
 * Contact details that can be recognised without a model. Runs in the browser before a
 * chat message leaves the page, and again on the Worker before anything reaches an AI.
 */

export type PiiKind = 'email' | 'phone'

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/
// 10–11 digit domestic numbers (leading 0) or +81, with at most one separator between digits.
const PHONE = /(?<!\d)(?:\+81[-\s]?\d|0\d)(?:[-\s().‐-―−ー]{0,2}\d){8,9}(?!\d)/

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
