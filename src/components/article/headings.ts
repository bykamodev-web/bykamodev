/**
 * Server-side table-of-contents helpers for CMS rich text. microCMS already emits ids on
 * headings; any `<h2>` without one gets a stable `section-N` id so the TOC can link to it.
 */
export interface TocHeading {
  id: string
  text: string
}

const H2 = /<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/g
const ID = /\sid="([^"]+)"/

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", nbsp: ' ' }

const toText = (html: string): string =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|apos|#39|nbsp);/g, (_, name: string) => ENTITIES[name])
    .replace(/\s+/g, ' ')
    .trim()

export const withHeadingIds = (html: string): string => {
  let index = 0
  return html.replace(H2, (match, attrs: string | undefined, inner: string) => {
    index += 1
    if (attrs && ID.test(attrs)) return match
    return `<h2${attrs || ''} id="section-${index}">${inner}</h2>`
  })
}

export const extractHeadings = (html: string): TocHeading[] =>
  Array.from(html.matchAll(H2))
    .map((match) => ({ id: ID.exec(match[1] || '')?.[1] || '', text: toText(match[2]) }))
    .filter((heading) => heading.id && heading.text)
