/// <reference types="astro/client" />

declare module 'cloudflare:email' {
  export class EmailMessage {
    constructor(from: string, to: string, raw: string)
  }
}

type RateLimitBinding = {
  limit: (options: { key: string }) => Promise<{ success: boolean }>
}

type Runtime = import('@astrojs/cloudflare').Runtime<{
  EMAIL: {
    send: (message: import('cloudflare:email').EmailMessage) => Promise<void>
  }
  RL_CHAT_SESSION?: RateLimitBinding
  RL_CHAT_IP?: RateLimitBinding
  RL_SUBMIT_IP?: RateLimitBinding
  CONTACT_KV?: {
    get: (key: string) => Promise<string | null>
    put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>
  }
  TURNSTILE_SECRET_KEY?: string
  OPENAI_API_KEY?: string
  TYPESAFE_API_KEY?: string
  CHAT_SESSION_SECRET?: string
}>

declare namespace App {
  interface Locals extends Runtime {}
}

interface ImportMetaEnv {
  readonly MICROCMS_SERVICE_DOMAIN: string
  readonly MICROCMS_API_KEY: string
  readonly SITE_URL: string
  readonly TURNSTILE_SITE_KEY: string
  readonly TURNSTILE_SECRET_KEY: string
  readonly OPENAI_API_KEY?: string
  readonly TYPESAFE_API_KEY?: string
  readonly CHAT_SESSION_SECRET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
