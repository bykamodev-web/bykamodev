import { runAll, type Cleanup } from './env'
import { initIntro } from './intro'
import { initHeader } from './header'
import { initReveal } from './reveal'
import { initScroll } from './scroll'
import { initMagnetic } from './magnetic'
import { initCursor } from './cursor'
import { initCount } from './count'
import { initClock } from './clock'
import { initMarquee } from './marquee'
import { initHeroAssembly } from './hero-assembly'
import { initNotesPreview } from './notes-preview'
import { initProcessDraw } from './process-draw'
import { initToc } from './toc'

/*
 * Single motion entry point. Everything (re)initialises on `astro:page-load` (initial load and
 * every ClientRouter navigation) and is torn down on `astro:before-swap`.
 * Reduced motion (`prefers-reduced-motion: reduce`) is honoured inside every module via env.ts.
 */
const modules: Array<() => Cleanup> = [
  initIntro,
  initHeader,
  initReveal,
  initScroll,
  initMagnetic,
  initCursor,
  initCount,
  initClock,
  initMarquee,
  initHeroAssembly,
  initNotesPreview,
  initProcessDraw,
  initToc,
]

let cleanups: Cleanup[] = []

const safely = (init: () => Cleanup): Cleanup => {
  try {
    return init()
  } catch (error) {
    window.reportError?.(error)
    return () => {}
  }
}

const teardown = (): void => {
  runAll(cleanups)
  cleanups = []
}

const init = (): void => {
  teardown()
  document.documentElement.classList.add('js', 'motion-ready')
  cleanups = modules.map(safely)
}

// Pages rendered without <ClientRouter /> never fire astro:page-load, so start immediately there.
if (document.querySelector('meta[name="astro-view-transitions-enabled"]')) {
  document.addEventListener('astro:page-load', init)
  document.addEventListener('astro:before-swap', teardown)
} else {
  init()
}
