import { failureOf, postJson, type ApiFailure } from './request.ts'
import type { ContactState } from './state.ts'

/** The final send. This is the only request that carries the visitor's name and e-mail. */

export interface ContactFields {
  name: string
  email: string
  category: string
  summary: string
  message: string
  honey: string
}

const SUBMIT_FAILED = '送信に失敗しました。'

export function buildPayload(state: ContactState, fields: ContactFields, turnstile: string, timestamp: number): Record<string, unknown> {
  const common = {
    name: fields.name,
    email: fields.email,
    category: fields.category,
    _timestamp: timestamp,
    _honey: fields.honey,
    _turnstile: turnstile,
  }

  return state.mode === 'chat'
    ? { mode: 'chat', ...common, summary: fields.summary, transcript: state.messages }
    : { mode: 'form', ...common, message: fields.message }
}

export async function submitContact(payload: Record<string, unknown>): Promise<{ ok: true } | ApiFailure> {
  const res = await postJson('/api/contact', payload)
  return res?.ok ? { ok: true } : failureOf(res, SUBMIT_FAILED)
}
