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

type Waiter = { resolve: (fresh: string) => void; reject: (error: Error) => void }

const POLL_MS = 100
const READY_TIMEOUT_MS = 15_000
const TOKEN_TIMEOUT_MS = 60_000

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

export function createTurnstile(container: HTMLElement): TokenSource {
  let token: string | null = null
  /** True when the widget holds no usable token and must be reset before it issues another. */
  let needsReset = false
  let waiters: ReadonlyArray<Waiter> = []

  const widget = whenReady().then((api) => {
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

    const id: string = api.render(container, {
      sitekey: container.dataset.sitekey ?? '',
      theme: 'light',
      appearance: 'interaction-only',
      callback: onToken,
      'expired-callback': () => { token = null },
      'error-callback': onError,
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
        const timer = setTimeout(() => {
          waiters = waiters.filter((queued) => queued !== waiter)
          needsReset = true
          reject(new TurnstileError('timeout'))
        }, TOKEN_TIMEOUT_MS)
        waiters = [...waiters, waiter]
        if (needsReset) {
          needsReset = false
          api.reset(id)
        }
      })
    },
  }
}
