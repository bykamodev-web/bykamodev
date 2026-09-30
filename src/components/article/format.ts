/** Small pure helpers shared by the collection and article components. */

const KIND_LABELS: Record<string, string> = {
  log: 'Log',
  howto: 'How-to',
  'case-study': 'Case Study',
  thinking: 'Thinking',
}

export const kindLabel = (kind?: string): string => (kind ? KIND_LABELS[kind] || kind : 'Note')

/** `2026.07.01` — mono-friendly, fixed width. */
export const formatDotDate = (value?: string): string => {
  if (!value) return 'DRAFT'
  const date = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return `${jst.getUTCFullYear()}.${pad(jst.getUTCMonth() + 1)}.${pad(jst.getUTCDate())}`
}

export const pad2 = (value: number): string => String(value).padStart(2, '0')

/** Visual width of a title: full-width glyphs count 1, Latin/digits ~0.55. */
const visualLength = (text: string): number =>
  Array.from(text).reduce((sum, char) => sum + (/[　-鿿＀-￯]/.test(char) ? 1 : 0.55), 0)

export type TitleScale = 'xl' | 'lg' | 'md' | 'sm'

/** Picks a display size so long Japanese titles stay within ~3 lines at 1440 and ~5 at 390. */
export const titleScale = (title: string): TitleScale => {
  const length = visualLength(title)
  if (length <= 16) return 'xl'
  if (length <= 28) return 'lg'
  if (length <= 42) return 'md'
  return 'sm'
}

/** Hostname for a link row, falling back to the raw URL. */
export const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
