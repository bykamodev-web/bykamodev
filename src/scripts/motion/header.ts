import { selectAll, listen, runAll, type Cleanup } from './env'

const FOCUSABLE = 'a[href], button:not([disabled])'

/** Header persists across ClientRouter navigations, so the current-page marker is refreshed here. */
const markCurrent = (): void => {
  const path = window.location.pathname
  selectAll<HTMLAnchorElement>('[data-nav-link]').forEach((link) => {
    const href = link.getAttribute('href') || ''
    const current = href !== '/' && (path === href || path.startsWith(`${href}/`))
    if (current) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  })
}

const trapFocus = (menu: HTMLElement, button: HTMLElement) => (event: KeyboardEvent): void => {
  if (event.key !== 'Tab') return
  const items = [button, ...selectAll<HTMLElement>(FOCUSABLE, menu)]
  const first = items[0]
  const last = items[items.length - 1]
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}

const setOpen = (menu: HTMLElement, button: HTMLElement, open: boolean): void => {
  menu.classList.toggle('is-open', open)
  menu.toggleAttribute('inert', !open)
  menu.setAttribute('aria-hidden', String(!open))
  button.setAttribute('aria-expanded', String(open))
  button.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く')
  document.documentElement.classList.toggle('menu-open', open)
}

const initMenu = (): Cleanup => {
  const button = document.getElementById('mobile-menu-btn')
  const menu = document.getElementById('mobile-menu')
  if (!button || !menu) return () => {}
  const isOpen = (): boolean => menu.classList.contains('is-open')
  const close = (): void => { if (isOpen()) setOpen(menu, button, false) }
  const toggle = (): void => setOpen(menu, button, !isOpen())
  const onKey = (event: KeyboardEvent): void => {
    if (!isOpen()) return
    if (event.key === 'Escape') { close(); button.focus(); return }
    trapFocus(menu, button)(event)
  }
  const onMenuClick = (event: MouseEvent): void => {
    if ((event.target as Element).closest('a')) close()
  }
  const onResize = (): void => { if (window.innerWidth >= 768) close() }

  setOpen(menu, button, false)
  return runAll.bind(null, [
    listen(button, 'click', toggle, { passive: true }),
    listen(document, 'keydown', onKey, { passive: false }),
    listen(menu, 'click', onMenuClick),
    listen(window, 'resize', onResize),
    close,
  ])
}

export const initHeader = (): Cleanup => {
  markCurrent()
  return initMenu()
}
