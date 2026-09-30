import { prefersReducedMotion, selectAll, listen, runAll, type Cleanup } from './env'
import { introDone } from './intro'
import { subscribe } from './raf'

const TARGETS = '[data-reveal], .reveal'

/** `data-stagger` gives each direct child an index (`--i`) unless markup already set one. */
const applyStagger = (): void => {
  selectAll('[data-stagger]').forEach((parent) => {
    Array.from(parent.children).forEach((child, index) => {
      const el = child as HTMLElement
      if (!el.style.getPropertyValue('--i')) el.style.setProperty('--i', String(index))
    })
  })
}

const standaloneMarkers = (): HTMLElement[] =>
  selectAll('.marker').filter((marker) => !marker.closest(TARGETS))

/** Clip-path hides the node from IntersectionObserver, so clip reveals are watched via their parent. */
const watchTarget = (node: HTMLElement): Element =>
  node.dataset.reveal === 'clip' && node.parentElement ? node.parentElement : node

const show = (node: Element): void => node.classList.add('is-visible')

export const initReveal = (): Cleanup => {
  applyStagger()
  const nodes = [...selectAll(TARGETS), ...standaloneMarkers()]
  if (!nodes.length) return () => {}

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    nodes.forEach(show)
    return () => {}
  }

  const byTarget = new Map<Element, HTMLElement[]>()
  nodes.forEach((node) => {
    const target = watchTarget(node)
    byTarget.set(target, [...(byTarget.get(target) || []), node])
  })

  const reveal = (target: Element): void => {
    byTarget.get(target)?.forEach(show)
    byTarget.delete(target)
    observer.unobserve(target)
  }

  const observer = new IntersectionObserver((entries) => {
    entries.filter((entry) => entry.isIntersecting).forEach((entry) => reveal(entry.target))
  }, { threshold: 0.1, rootMargin: '0px 0px -2% 0px' })

  // Jumps (anchors, restored scroll) can skip past nodes without an intersection change:
  // anything that ends up above the viewport is revealed on the next frame.
  let dirty = false
  const catchUp = (): void => {
    if (!dirty) return
    dirty = false
    Array.from(byTarget.keys())
      .filter((target) => target.getBoundingClientRect().bottom < 0)
      .forEach(reveal)
  }

  let active = true
  let cleanups: Cleanup[] = []
  // Nodes already inside the first viewport reveal straight away: their hidden offset
  // (translateY 24px) could otherwise push a node sitting at the fold past the IO line.
  const inFirstView = (target: Element): boolean => {
    const rect = target.getBoundingClientRect()
    return rect.bottom > 0 && rect.top < window.innerHeight && (rect.width > 0 || rect.height > 0)
  }

  introDone().then(() => {
    if (!active) return
    const [now, later] = Array.from(byTarget.keys()).reduce<[Element[], Element[]]>(
      ([a, b], target) => (inFirstView(target) ? [[...a, target], b] : [a, [...b, target]]),
      [[], []],
    )
    later.forEach((target) => observer.observe(target))
    now.forEach(reveal)
    dirty = true
    cleanups = [subscribe(catchUp), listen(window, 'scroll', () => { dirty = true })]
  })

  return () => {
    active = false
    observer.disconnect()
    runAll(cleanups)
  }
}
