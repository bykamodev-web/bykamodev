import { prefersReducedMotion, selectAll, type Cleanup } from './env'

const DURATION = 1200

const format = (value: number, pad: number): string => String(Math.round(value)).padStart(pad, '0')

const animate = (el: HTMLElement): void => {
  const target = Number(el.dataset.count) || 0
  const pad = Number(el.dataset.countPad) || 0
  const start = performance.now()
  const step = (now: number): void => {
    const progress = Math.min(1, (now - start) / DURATION)
    el.textContent = format(target * (1 - Math.pow(1 - progress, 4)), pad)
    if (progress < 1) window.requestAnimationFrame(step)
  }
  window.requestAnimationFrame(step)
}

/** `data-count="12"` (optional `data-count-pad="2"`) counts up once visible. Markup holds the final value. */
export const initCount = (): Cleanup => {
  const nodes = selectAll('[data-count]')
  if (!nodes.length || prefersReducedMotion()) return () => {}
  const observer = new IntersectionObserver((entries) => {
    entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
      observer.unobserve(entry.target)
      animate(entry.target as HTMLElement)
    })
  }, { threshold: 0.6 })
  nodes.forEach((node) => observer.observe(node))
  return () => observer.disconnect()
}
