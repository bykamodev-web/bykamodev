import { clamp, hasFinePointer, lerp, prefersReducedMotion, selectAll, listen, runAll, type Cleanup } from './env'
import { subscribe } from './raf'

/*
 * Floating cover preview for `[data-notes-preview]` containers: rows carrying
 * `data-preview-src` show a framed image that trails the pointer on both axes, parked at a
 * fixed offset to the lower right of the cursor and flipped to the other side near a
 * viewport edge, so it never sits on the text under the pointer. Fine pointers only.
 */
const OFFSET = 28
const EDGE = 12
const EASE = 0.18

interface Point { x: number; y: number }

/** Lower-right of the pointer; flips left / up when the frame would leave the viewport. */
const placeFor = (pointer: Point, size: Point): Point => {
  const right = pointer.x + OFFSET
  const below = pointer.y + OFFSET
  const x = right + size.x + EDGE > window.innerWidth ? pointer.x - OFFSET - size.x : right
  const y = below + size.y + EDGE > window.innerHeight ? pointer.y - OFFSET - size.y : below
  return {
    x: clamp(x, EDGE, window.innerWidth - size.x - EDGE),
    y: clamp(y, EDGE, window.innerHeight - size.y - EDGE),
  }
}

const bindContainer = (container: HTMLElement): Cleanup => {
  const preview = container.querySelector<HTMLElement>('[data-preview-frame]')
  const image = preview?.querySelector('img')
  if (!preview || !image) return () => {}
  let pointer: Point = { x: 0, y: 0 }
  let current: Point = { x: 0, y: 0 }
  let visible = false

  const size = (): Point => ({ x: preview.offsetWidth, y: preview.offsetHeight })
  const paint = (): void => {
    preview.style.transform = `translate3d(${current.x.toFixed(1)}px, ${current.y.toFixed(1)}px, 0)`
  }

  const tick = (): void => {
    if (!visible) return
    const target = placeFor(pointer, size())
    current = { x: lerp(current.x, target.x, EASE), y: lerp(current.y, target.y, EASE) }
    paint()
  }

  const move = (event: PointerEvent): void => {
    pointer = { x: event.clientX, y: event.clientY }
  }
  const enter = (event: PointerEvent): void => {
    const row = event.currentTarget as HTMLElement
    const src = row.dataset.previewSrc
    if (!src) return
    pointer = { x: event.clientX, y: event.clientY }
    // First appearance lands in place (the clip-reveal does the entrance); later rows glide.
    if (!visible) { current = placeFor(pointer, size()); paint() }
    if (image.getAttribute('src') !== src) image.setAttribute('src', src)
    visible = true
    preview.classList.add('is-active')
  }
  const leave = (): void => {
    visible = false
    preview.classList.remove('is-active')
  }
  const rows = selectAll('[data-preview-src]', container)
  return runAll.bind(null, [
    subscribe(tick),
    listen(container, 'pointermove', move),
    ...rows.flatMap((row) => [listen(row, 'pointerenter', enter), listen(row, 'pointerleave', leave)]),
  ])
}

export const initNotesPreview = (): Cleanup => {
  if (!hasFinePointer() || prefersReducedMotion()) return () => {}
  return runAll.bind(null, selectAll('[data-notes-preview]').map(bindContainer))
}
