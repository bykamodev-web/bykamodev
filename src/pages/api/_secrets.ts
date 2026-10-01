import { getSecret, type ServerEnv } from '@/lib/contact/server-env'
import { TURNSTILE_TEST_KEYS } from '@/lib/contact/turnstile'

/** `astro dev` pairs the test site key with the test secret; every build uses the real one. */
export function turnstileSecret(env: ServerEnv): string | undefined {
  return import.meta.env.DEV ? TURNSTILE_TEST_KEYS.secret : getSecret(env, 'TURNSTILE_SECRET_KEY', import.meta.env.TURNSTILE_SECRET_KEY)
}

/**
 * Production reads Worker secrets from the runtime env. For the three chat secrets the
 * `import.meta.env` values (from `.env.local`) are used only under `astro dev`; the `DEV`
 * guard keeps them out of the built Worker bundle. `TURNSTILE_SECRET_KEY` keeps its older,
 * unguarded build-time fallback so existing deploys behave as before.
 */
export function chatSecrets(env: ServerEnv) {
  return {
    turnstile: turnstileSecret(env),
    session: getSecret(env, 'CHAT_SESSION_SECRET', import.meta.env.DEV ? import.meta.env.CHAT_SESSION_SECRET : undefined),
    openai: getSecret(env, 'OPENAI_API_KEY', import.meta.env.DEV ? import.meta.env.OPENAI_API_KEY : undefined),
    typesafe: getSecret(env, 'TYPESAFE_API_KEY', import.meta.env.DEV ? import.meta.env.TYPESAFE_API_KEY : undefined),
  }
}
