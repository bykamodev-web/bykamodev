import { clamp, prefersReducedMotion, selectAll, listen, runAll, type Cleanup } from './env'
import { subscribe } from './raf'

/** Where the drawn tip is, in viewport px, along the rail's main axis. */
const tipOf = (rail: DOMRect, draw: number): { horizontal: boolean; tip: number } => {
  const horizontal = rail.width >= rail.height
  return horizontal
    ? { horizontal, tip: rail.left + rail.width * draw }
    : { horizontal, tip: rail.top + rail.height * draw }
}

const update = (root: HTMLElement, viewport: number): void => {
  const rail = root.querySelector('.process__rail')
  if (!rail) return
  const box = root.getBoundingClientRect()
  if (box.bottom < -100 || box.top > viewport + 100) return
  // Starts when the block's top passes 80% of the viewport, completes when its bottom reaches 70%.
  const start = viewport * 0.8
  const span = Math.max(box.height + viewport * 0.1, viewport * 0.35)
  const draw = clamp((start - box.top) / span, 0, 1)
  root.style.setProperty('--draw', draw.toFixed(4))
  const { horizontal, tip } = tipOf(rail.getBoundingClientRect(), draw)
  selectAll('[data-process-step] .process__node', root).forEach((node) => {
    const rect = node.getBoundingClientRect()
    const centre = horizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2
    node.parentElement?.classList.toggle('is-on', draw > 0 && tip >= centre - 1)
  })
}

/** `[data-process-draw]`: an ink line that draws with scroll and lights each node it reaches. */
export const initProcessDraw = (): Cleanup => {
  const roots = selectAll('[data-process-draw]')
  if (!roots.length || prefersReducedMotion()) return () => {}
  roots.forEach((root) => root.classList.add('is-drawing'))
  let dirty = true
  const tick = (): void => {
    if (!dirty) return
    dirty = false
    roots.forEach((root) => update(root, window.innerHeight))
  }
  const markDirty = (): void => { dirty = true }
  return runAll.bind(null, [
    subscribe(tick),
    listen(window, 'scroll', markDirty),
    listen(window, 'resize', markDirty),
    () => roots.forEach((root) => {
      root.classList.remove('is-drawing')
      root.style.removeProperty('--draw')
    }),
  ])
}
