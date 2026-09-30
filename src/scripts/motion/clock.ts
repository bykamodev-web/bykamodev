import { selectAll, type Cleanup } from './env'

const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Tokyo',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

/** `[data-clock]` shows live Tokyo time (HH:MM:SS). Server markup keeps a static fallback. */
export const initClock = (): Cleanup => {
  const nodes = selectAll('[data-clock]')
  if (!nodes.length) return () => {}
  const render = (): void => {
    const text = formatter.format(new Date())
    nodes.forEach((node) => { node.textContent = text })
  }
  render()
  const timer = window.setInterval(render, 1000)
  return () => window.clearInterval(timer)
}
