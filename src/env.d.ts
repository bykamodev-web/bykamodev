/// <reference types="astro/client" />

type Runtime = import('@astrojs/cloudflare').Runtime<{
  EMAIL: {
    send: (message: import('cloudflare:email').EmailMessage) => Promise<void>
  }
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
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
