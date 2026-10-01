import type { z } from 'zod'

export type FieldIssue = { field: string; message: string }

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }

export function jsonResponse(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } })
}

export function errorResponse(
  status: number,
  error: string,
  extra: { code?: string; details?: FieldIssue[]; headers?: Record<string, string> } = {},
): Response {
  const { headers, ...rest } = extra
  return jsonResponse({ success: false, error, ...rest }, status, headers)
}

export async function readJsonBody(request: Request): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return { ok: false, response: errorResponse(400, 'Invalid content type') }
  }
  try {
    return { ok: true, body: await request.json() }
  } catch {
    return { ok: false, response: errorResponse(400, 'Invalid JSON') }
  }
}

export function zodDetails(error: z.ZodError): FieldIssue[] {
  return error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))
}

export function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? 'unknown'
}
