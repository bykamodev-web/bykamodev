import type { Cleanup } from './env'

/**
 * First-visit curtain. The inline head script adds `intro-pending` to <html> (only on the first
 * page of a session, never for reduced motion) and removes it after 2.5s as a hard fail-safe.
 */
const COUNT_MS = 640
const WIPE_MS = 520
const root = document.documentElement

let done: Promise<void> = Promise.resolve()

export const introDone = (): Promise<void> => done

const finish = (): void => {
  root.classList.remove('intro-pending', 'intro-leaving')
  try { sessionStorage.setItem('bk-intro', '1') } catch { /* storage may be blocked */ }
}

const runCounter = (counter: HTMLElement | null, onEnd: () => void): number => {
  const start = performance.now()
  const step = (now: number): void => {
    const progress = Math.min(1, (now - start) / COUNT_MS)
    const eased = 1 - Math.pow(1 - progress, 3)
    if (counter) counter.textContent = String(Math.round(eased * 100)).padStart(3, '0')
    if (progress < 1) window.requestAnimationFrame(step)
    else onEnd()
  }
  return window.requestAnimationFrame(step)
}

export const initIntro = (): Cleanup => {
  if (!root.classList.contains('intro-pending')) {
    done = Promise.resolve()
    return () => {}
  }
  const counter = document.querySelector<HTMLElement>('[data-intro-count]')
  let timer = 0
  done = new Promise<void>((resolve) => {
    runCounter(counter, () => {
      root.classList.add('intro-leaving')
      timer = window.setTimeout(() => { finish(); resolve() }, WIPE_MS)
      window.setTimeout(resolve, WIPE_MS * 0.45)
    })
  })
  return () => { window.clearTimeout(timer); finish() }
}
