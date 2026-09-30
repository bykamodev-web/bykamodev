import { clamp, hasFinePointer, prefersReducedMotion, selectAll, listen, runAll, type Cleanup } from './env'

const PULL = 10

const bind = (el: HTMLElement): Cleanup => {
  const move = (event: PointerEvent): void => {
    const rect = el.getBoundingClientRect()
    const x = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
    const y = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)
    el.classList.add('is-magnetized')
    el.style.setProperty('--mag-x', `${(clamp(x, -1, 1) * PULL).toFixed(2)}px`)
    el.style.setProperty('--mag-y', `${(clamp(y, -1, 1) * PULL * 0.6).toFixed(2)}px`)
  }
  const leave = (): void => {
    el.classList.remove('is-magnetized')
    el.style.setProperty('--mag-x', '0px')
    el.style.setProperty('--mag-y', '0px')
  }
  return runAll.bind(null, [listen(el, 'pointermove', move), listen(el, 'pointerleave', leave)])
}

export const initMagnetic = (): Cleanup => {
  if (!hasFinePointer() || prefersReducedMotion()) return () => {}
  return runAll.bind(null, selectAll('[data-magnetic]').map(bind))
}
