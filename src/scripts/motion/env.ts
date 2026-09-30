export type Cleanup = () => void

const query = (media: string): boolean => window.matchMedia(media).matches

export const prefersReducedMotion = (): boolean => query('(prefers-reduced-motion: reduce)')

/** Hover-capable fine pointer (mouse / trackpad), never touch. */
export const hasFinePointer = (): boolean => query('(hover: hover) and (pointer: fine)')

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

export const lerp = (from: number, to: number, amount: number): number => from + (to - from) * amount

export const selectAll = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll<T>(selector))

export const listen = <K extends keyof WindowEventMap>(
  target: Window | Document | HTMLElement,
  type: K | string,
  handler: (event: never) => void,
  options: AddEventListenerOptions = { passive: true },
): Cleanup => {
  const fn = handler as EventListener
  target.addEventListener(type, fn, options)
  return () => target.removeEventListener(type, fn, options)
}

export const runAll = (cleanups: Cleanup[]): void => cleanups.forEach((cleanup) => cleanup())
