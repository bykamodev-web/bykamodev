import { clamp, prefersReducedMotion, selectAll, listen, runAll, type Cleanup } from './env'
import { subscribe } from './raf'

interface ParallaxNode { el: HTMLElement; factor: number }

const MAX_SHIFT = 80

const readParallax = (): ParallaxNode[] =>
  selectAll('[data-parallax]').map((el) => ({ el, factor: Number(el.dataset.parallax) || 0.08 }))

const updateParallax = (nodes: ParallaxNode[], viewport: number): void => {
  nodes.forEach(({ el, factor }) => {
    const rect = el.getBoundingClientRect()
    if (rect.bottom < -200 || rect.top > viewport + 200) return
    const offset = rect.top + rect.height / 2 - viewport / 2
    el.style.setProperty('--parallax-y', `${clamp(offset * -factor, -MAX_SHIFT, MAX_SHIFT).toFixed(2)}px`)
  })
}

const updateHeader = (header: HTMLElement | null, y: number, lastY: number): void => {
  if (!header) return
  header.classList.toggle('is-scrolled', y > 8)
  if (document.documentElement.classList.contains('menu-open')) return
  const goingDown = y > lastY + 2
  const goingUp = y < lastY - 2
  if (goingDown && y > 160) header.classList.add('is-hidden')
  if (goingUp || y < 160) header.classList.remove('is-hidden')
}

/** Scroll progress hairline, hide-on-scroll header and parallax share one rAF subscriber. */
export const initScroll = (): Cleanup => {
  const header = document.querySelector<HTMLElement>('[data-site-header]')
  const progress = document.querySelector<HTMLElement>('[data-scroll-progress]')
  const parallax = prefersReducedMotion() ? [] : readParallax()
  let lastY = window.scrollY
  let dirty = true

  const tick = (): void => {
    if (!dirty) return
    dirty = false
    const y = window.scrollY
    const max = document.documentElement.scrollHeight - window.innerHeight
    progress?.style.setProperty('transform', `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`)
    updateHeader(header, y, lastY)
    updateParallax(parallax, window.innerHeight)
    lastY = y
  }

  const markDirty = (): void => { dirty = true }
  header?.classList.remove('is-hidden')
  return runAll.bind(null, [
    subscribe(tick),
    listen(window, 'scroll', markDirty),
    listen(window, 'resize', markDirty),
  ])
}
