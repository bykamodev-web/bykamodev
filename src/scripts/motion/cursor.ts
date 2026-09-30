import { hasFinePointer, lerp, prefersReducedMotion, listen, runAll, type Cleanup } from './env'
import { subscribe } from './raf'

const INTERACTIVE = 'a, button, [role="button"], input, textarea, select, label, summary'

const createCursor = (): { root: HTMLElement; label: HTMLElement } => {
  const root = document.createElement('div')
  root.className = 'cursor is-hidden'
  root.setAttribute('aria-hidden', 'true')
  const label = document.createElement('span')
  label.className = 'cursor__label'
  const dot = document.createElement('span')
  dot.className = 'cursor__dot'
  const ring = document.createElement('span')
  ring.className = 'cursor__ring'
  root.append(ring, dot, label)
  document.body.append(root)
  return { root, label }
}

const applyState = (root: HTMLElement, label: HTMLElement, target: Element | null): void => {
  const labelled = target?.closest<HTMLElement>('[data-cursor]')
  const interactive = target?.closest(INTERACTIVE)
  root.classList.toggle('is-label', Boolean(labelled))
  root.classList.toggle('is-link', !labelled && Boolean(interactive))
  root.classList.toggle('on-dark', Boolean(target?.closest('.surface-dark, .surface-teal')))
  if (labelled) label.textContent = labelled.dataset.cursor || 'VIEW'
}

/** A small ink square that trails the pointer; grows into a yellow label over `[data-cursor]`. */
export const initCursor = (): Cleanup => {
  if (!hasFinePointer() || prefersReducedMotion()) return () => {}
  const { root, label } = createCursor()
  const target = { x: -100, y: -100 }
  const current = { x: -100, y: -100 }

  const move = (event: PointerEvent): void => {
    target.x = event.clientX
    target.y = event.clientY
    root.classList.remove('is-hidden')
  }
  const over = (event: PointerEvent): void => applyState(root, label, event.target as Element)
  const hide = (): void => root.classList.add('is-hidden')

  const tick = (): void => {
    current.x = lerp(current.x, target.x, 0.22)
    current.y = lerp(current.y, target.y, 0.22)
    root.style.transform = `translate3d(${current.x.toFixed(1)}px, ${current.y.toFixed(1)}px, 0)`
  }

  return runAll.bind(null, [
    subscribe(tick),
    listen(window, 'pointermove', move),
    listen(document, 'pointerover', over),
    listen(document.documentElement, 'pointerleave', hide),
    () => root.remove(),
  ])
}
