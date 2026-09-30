import { selectAll, type Cleanup } from './env'

/** Pauses `.marquee` loops while offscreen. Reduced motion is handled statically in CSS. */
export const initMarquee = (): Cleanup => {
  const nodes = selectAll('.marquee, [data-loop]')
  if (!nodes.length || !('IntersectionObserver' in window)) return () => {}
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle('is-paused', !entry.isIntersecting))
  })
  nodes.forEach((node) => observer.observe(node))
  return () => observer.disconnect()
}
