export type ServerEnv = Record<string, unknown>

/** Cloudflare puts bindings on `locals.runtime.env`; plain `locals` is the dev fallback. */
export function getEnv(locals: unknown): ServerEnv {
  const l = locals as Record<string, unknown>
  if (l.runtime && typeof l.runtime === 'object') {
    const rt = l.runtime as Record<string, unknown>
    if (rt.env && typeof rt.env === 'object') return rt.env as ServerEnv
  }
  return l
}

/** Runtime secret first; `fallback` is what the route read from `import.meta.env`. */
export function getSecret(env: ServerEnv, key: string, fallback?: string): string | undefined {
  const value = env[key]
  return typeof value === 'string' && value.length > 0 ? value : fallback || undefined
}
