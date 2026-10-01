export type FieldIssue = { field: string; message: string }

export type ApiFailure = {
  ok: false
  /** 0 when the request never reached the server. */
  status: number
  code?: string
  error: string
  details?: FieldIssue[]
}

export const NETWORK_ERROR = 'ネットワークエラーが発生しました。接続を確認して再度お試しください。'

export async function postJson(url: string, body: unknown): Promise<Response | null> {
  try {
    return await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  } catch {
    return null
  }
}

export async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    const data: unknown = await res.json()
    return data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export async function failureOf(res: Response | null, fallback: string): Promise<ApiFailure> {
  if (!res) return { ok: false, status: 0, error: NETWORK_ERROR }
  const data = await readJson(res)
  return {
    ok: false,
    status: res.status,
    code: typeof data.code === 'string' ? data.code : undefined,
    error: typeof data.error === 'string' ? data.error : fallback,
    details: Array.isArray(data.details) ? (data.details as FieldIssue[]) : undefined,
  }
}
