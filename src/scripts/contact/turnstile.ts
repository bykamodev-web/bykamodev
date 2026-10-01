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

const POLL_MS = 100
const READY_TIMEOUT_MS = 15_000
const TOKEN_TIMEOUT_MS = 60_000

function whenReady(): Promise<TurnstileApi> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    const check = (): void => {
      if (window.turnstile) resolve(window.turnstile)
      else if (Date.now() - startedAt > READY_TIMEOUT_MS) reject(new Error('Turnstile did not load'))
      else setTimeout(check, POLL_MS)
    }
    check()
  })
}

export function createTurnstile(container: HTMLElement): TokenSource {
  let token: string | null = null
  let spent = false
  let waiters: ReadonlyArray<(fresh: string) => void> = []

  const widget = whenReady().then((api) => {
    const onToken = (fresh: string): void => {
      const [next, ...queued] = waiters
      waiters = queued
      if (!next) {
        token = fresh
        return
      }
      next(fresh)
      if (queued.length > 0) api.reset(id)
      else spent = true
    }

    const id: string = api.render(container, {
      sitekey: container.dataset.sitekey ?? '',
      theme: 'light',
      appearance: 'interaction-only',
      callback: onToken,
      'expired-callback': () => { token = null },
      'error-callback': () => { token = null },
    })
    return { api, id }
  })

  return {
    async getFreshToken(): Promise<string> {
      const { api, id } = await widget

      if (token) {
        const ready = token
        token = null
        spent = true
        return ready
      }

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Turnstile timed out')), TOKEN_TIMEOUT_MS)
        waiters = [...waiters, (fresh) => { clearTimeout(timer); resolve(fresh) }]
        if (spent) {
          spent = false
          api.reset(id)
        }
      })
    },
  }
}
