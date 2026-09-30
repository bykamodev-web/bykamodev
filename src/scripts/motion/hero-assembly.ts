import { clamp, hasFinePointer, lerp, prefersReducedMotion, selectAll, listen, runAll, type Cleanup } from './env'
import { introDone } from './intro'
import { subscribe } from './raf'

/*
 * `[data-assembly]` illustrations: parts (`[data-part]` with --from-x/--from-y/--from-r) start
 * scattered and snap into their slots (`is-assembled`). Once settled, depth layers
 * (`[data-depth]`, --d) follow the pointer and hovering re-scatters the parts briefly.
 * `data-mode="scattered"` (404) stays scattered and assembles only while hovered.
 */
const START_DELAY = 320
const SETTLE_MS = 1900
const JOLT_MS = 170
const JOLT_COOLDOWN = 1400

const bindScattered = (root: HTMLElement): Cleanup => {
  const on = (): void => root.classList.add('is-assembled')
  const off = (): void => root.classList.remove('is-assembled')
  return runAll.bind(null, [listen(root, 'pointerenter', on), listen(root, 'pointerleave', off)])
}

const bindPointerDepth = (root: HTMLElement): Cleanup => {
  const target = { x: 0, y: 0 }
  const current = { x: 0, y: 0 }
  const move = (event: PointerEvent): void => {
    target.x = clamp((event.clientX / window.innerWidth) * 2 - 1, -1, 1)
    target.y = clamp((event.clientY / window.innerHeight) * 2 - 1, -1, 1)
  }
  const tick = (): void => {
    if (Math.abs(target.x - current.x) + Math.abs(target.y - current.y) < 0.001) return
    current.x = lerp(current.x, target.x, 0.08)
    current.y = lerp(current.y, target.y, 0.08)
    root.style.setProperty('--px', current.x.toFixed(3))
    root.style.setProperty('--py', current.y.toFixed(3))
  }
  return runAll.bind(null, [subscribe(tick), listen(window, 'pointermove', move)])
}

const bindJolt = (root: HTMLElement): Cleanup => {
  let last = 0
  let timer = 0
  const jolt = (): void => {
    const now = performance.now()
    if (now - last < JOLT_COOLDOWN) return
    last = now
    root.classList.add('is-jolt')
    timer = window.setTimeout(() => root.classList.remove('is-jolt'), JOLT_MS)
  }
  return runAll.bind(null, [listen(root, 'pointerenter', jolt), () => window.clearTimeout(timer)])
}

const assemble = (root: HTMLElement): Cleanup => {
  if (prefersReducedMotion()) {
    root.classList.add('is-assembled', 'is-settled')
    return () => {}
  }
  let cleanups: Cleanup[] = []
  let alive = true
  const timers: number[] = []
  introDone().then(() => {
    if (!alive) return
    timers.push(window.setTimeout(() => root.classList.add('is-assembled'), START_DELAY))
    timers.push(window.setTimeout(() => {
      root.classList.add('is-settled')
      if (hasFinePointer()) cleanups = [bindPointerDepth(root), bindJolt(root)]
    }, START_DELAY + SETTLE_MS))
  })
  return () => {
    alive = false
    timers.forEach((timer) => window.clearTimeout(timer))
    runAll(cleanups)
  }
}

export const initHeroAssembly = (): Cleanup => {
  const roots = selectAll('[data-assembly]')
  return runAll.bind(null, roots.map((root) =>
    root.dataset.mode === 'scattered'
      ? (hasFinePointer() && !prefersReducedMotion() ? bindScattered(root) : () => {})
      : assemble(root)))
}
