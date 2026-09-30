import { clamp, prefersReducedMotion, selectAll, listen, runAll, type Cleanup } from './env'
import { subscribe } from './raf'

/*
 * Table of contents (`[data-toc]`): highlights the section being read (IntersectionObserver
 * wakes a recompute; no per-frame work while idle), fills a reading-progress hairline, and
 * scrolls smoothly to a heading on click — instantly under reduced motion.
 */
const ACTIVE_LINE = 0.3

interface Entry { id: string; heading: HTMLElement; links: HTMLAnchorElement[] }

const readEntries = (root: HTMLElement): Entry[] => {
  const links = selectAll<HTMLAnchorElement>('[data-toc-link]', root)
  const ids = Array.from(new Set(links.map((link) => decodeURIComponent(link.hash.slice(1)))))
  return ids
    .map((id) => ({ id, heading: document.getElementById(id), links: links.filter((link) => decodeURIComponent(link.hash.slice(1)) === id) }))
    .filter((entry): entry is Entry => entry.heading instanceof HTMLElement)
}

const currentIndex = (entries: Entry[]): number => {
  const line = window.innerHeight * ACTIVE_LINE
  return entries.reduce((found, entry, index) => (entry.heading.getBoundingClientRect().top <= line ? index : found), -1)
}

const readingProgress = (entries: Entry[]): number => {
  const article = entries[0].heading.parentElement
  if (!article) return 0
  const rect = article.getBoundingClientRect()
  return clamp((window.innerHeight * ACTIVE_LINE - rect.top) / Math.max(rect.height, 1), 0, 1)
}

const bindToc = (root: HTMLElement): Cleanup => {
  const entries = readEntries(root)
  if (!entries.length) return () => {}
  const progress = root.querySelector<HTMLElement>('[data-toc-progress]')
  const details = root.querySelector('details')
  let dirty = true
  let active = -2

  const tick = (): void => {
    if (!dirty) return
    dirty = false
    const index = currentIndex(entries)
    progress?.style.setProperty('--toc-progress', readingProgress(entries).toFixed(3))
    if (index === active) return
    active = index
    entries.forEach((entry, i) => entry.links.forEach((link) => {
      link.classList.toggle('is-active', i === index)
      if (i === index) link.setAttribute('aria-current', 'location')
      else link.removeAttribute('aria-current')
    }))
  }

  const observer = new IntersectionObserver(() => { dirty = true }, { rootMargin: `0px 0px -${100 - ACTIVE_LINE * 100}% 0px` })
  entries.forEach((entry) => observer.observe(entry.heading))

  const jump = (event: MouseEvent): void => {
    const link = event.currentTarget as HTMLAnchorElement
    const target = document.getElementById(decodeURIComponent(link.hash.slice(1)))
    if (!target) return
    event.preventDefault()
    target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
    history.replaceState(history.state, '', link.hash)
    if (details?.contains(link)) details.open = false
  }

  const links = entries.flatMap((entry) => entry.links)
  return runAll.bind(null, [
    () => observer.disconnect(),
    subscribe(tick),
    listen(window, 'scroll', () => { dirty = true }),
    listen(window, 'resize', () => { dirty = true }),
    ...links.map((link) => listen(link, 'click', jump, { passive: false })),
  ])
}

export const initToc = (): Cleanup => {
  if (!('IntersectionObserver' in window)) return () => {}
  return runAll.bind(null, selectAll('[data-toc]').map(bindToc))
}
