/**
 * One explicitly rendered Turnstile widget for the whole page. Tokens are single-use,
 * so every consumer asks for a fresh one: a spent widget is reset before it is reused.
 */

type TurnstileApi = {
  render(container: HTMLElement, options: Record<string, unknown>): string
  reset(widgetId: string): void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

export interface TokenSource {
  getFreshToken(): Promise<string>
}

export interface TurnstileHooks {
  /** The widget started or stopped asking the visitor to tick its checkbox. */
  onInteractive?: (needed: boolean) => void
  /** Someone is waiting for a token that only the visitor's click can produce. */
  onAttention?: () => void
}

type Waiter = { resolve: (fresh: string) => void; reject: (error: Error) => void }

const POLL_MS = 100
const READY_TIMEOUT_MS = 15_000
const TOKEN_TIMEOUT_MS = 60_000
const INTERACTIVE_TOKEN_TIMEOUT_MS = 180_000

export class TurnstileError extends Error {
  readonly code: string

  constructor(code: string) {
    super(`Turnstile failed: ${code}`)
    this.code = code
  }
}

/** Visitor-facing text for a failed challenge. The code is what Cloudflare's docs index errors by. */
export function describeTurnstileFailure(error: unknown): string {
  const code = error instanceof TurnstileError ? `(コード: ${error.code})` : ''
  return `認証を完了できませんでした${code}。ページを再読み込みしてお試しください。`
}

function whenReady(): Promise<TurnstileApi> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    const check = (): void => {
      if (window.turnstile) resolve(window.turnstile)
      else if (Date.now() - startedAt > READY_TIMEOUT_MS) reject(new TurnstileError('script-not-loaded'))
      else setTimeout(check, POLL_MS)
    }
    check()
  })
}

/** The key embedded at build time, or the one the Worker serves when the build had none. */
async function resolveSiteKey(container: HTMLElement): Promise<string> {
  if (container.dataset.sitekey) return container.dataset.sitekey

  try {
    const data: unknown = await (await fetch('/api/turnstile')).json()
    const siteKey = data && typeof data === 'object' ? (data as Record<string, unknown>).siteKey : undefined
    if (typeof siteKey === 'string' && siteKey) return siteKey
  } catch {
    // Reported below with the same code as a missing key.
  }
  throw new TurnstileError('site-key-unavailable')
}

export function createTurnstile(container: HTMLElement, hooks: TurnstileHooks = {}): TokenSource {
  let token: string | null = null
  /** True when the widget holds no usable token and must be reset before it issues another. */
  let needsReset = false
  let interactive = false
  let waiters: ReadonlyArray<Waiter> = []

  const widget = Promise.all([whenReady(), resolveSiteKey(container)]).then(([api, sitekey]) => {
    const onToken = (fresh: string): void => {
      const [next, ...queued] = waiters
      waiters = queued
      if (!next) {
        token = fresh
        return
      }
      next.resolve(fresh)
      if (queued.length > 0) api.reset(id)
      else needsReset = true
    }

    // Fail the waiting callers now instead of leaving them to the timeout.
    const onError = (code: unknown): void => {
      const failed = waiters
      token = null
      needsReset = true
      waiters = []
      for (const waiter of failed) waiter.reject(new TurnstileError(String(code ?? 'unknown')))
    }

    const setInteractive = (needed: boolean): void => {
      interactive = needed
      hooks.onInteractive?.(needed)
      if (needed && waiters.length > 0) hooks.onAttention?.()
    }

    const id: string = api.render(container, {
      sitekey,
      theme: 'light',
      appearance: 'interaction-only',
      callback: onToken,
      'expired-callback': () => { token = null },
      'error-callback': onError,
      'before-interactive-callback': () => setInteractive(true),
      'after-interactive-callback': () => setInteractive(false),
    })
    return { api, id }
  })

  return {
    async getFreshToken(): Promise<string> {
      const { api, id } = await widget

      if (token) {
        const ready = token
        token = null
        needsReset = true
        return ready
      }

      return new Promise((resolve, reject) => {
        const settle = <T>(finish: (value: T) => void) => (value: T): void => { clearTimeout(timer); finish(value) }
        const waiter: Waiter = { resolve: settle(resolve), reject: settle(reject) }
        // A caller that gave up must leave the queue, or the next token would go to nobody.
        const giveUp = (): void => {
          waiters = waiters.filter((queued) => queued !== waiter)
          needsReset = true
          reject(new TurnstileError('timeout'))
        }
        // A visitor who has to find and tick the checkbox gets longer than a silent challenge.
        const timer = setTimeout(giveUp, interactive ? INTERACTIVE_TOKEN_TIMEOUT_MS : TOKEN_TIMEOUT_MS)
        waiters = [...waiters, waiter]
        if (needsReset) {
          needsReset = false
          api.reset(id)
        }
        if (interactive) hooks.onAttention?.()
      })
    },
  }
}
