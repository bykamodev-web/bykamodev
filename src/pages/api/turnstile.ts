import type { APIRoute } from 'astro'
import { errorResponse, jsonResponse } from '@/lib/contact/http'
import { getEnv } from '@/lib/contact/server-env'
import { turnstileSiteKey } from './_secrets'

export const prerender = false

/** Serves the public Turnstile site key, so the prerendered form works whatever the build environment had. */
export const GET: APIRoute = ({ locals }) => {
  const siteKey = turnstileSiteKey(getEnv(locals))
  if (!siteKey) return errorResponse(500, 'Server configuration error')

  return jsonResponse({ success: true, siteKey }, 200, { 'Cache-Control': 'public, max-age=300' })
}
