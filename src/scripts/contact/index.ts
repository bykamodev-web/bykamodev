import { findPii, PII_LABELS } from '../../lib/contact/pii.ts'
import { createChatController } from './chat-controller.ts'
import { clearErrors, setSubmitting, showAlert, showFieldErrors } from './form-view.ts'
import { canSend, carryOverText, initialState, reduce, type Action, type ContactState } from './state.ts'
import { buildPayload, submitContact, type ContactFields } from './submit.ts'
import { createTurnstile, describeTurnstileFailure } from './turnstile.ts'
import { render, type ContactElements } from './view.ts'

/** Entry point for /contact/form: looks up the DOM once and wires the modules together. */

const MIN_DWELL_MS = 3500
const MAX_DWELL_MS = 50 * 60 * 1000

const byId = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id)
  if (!el) throw new Error(`Contact form: #${id} is missing`)
  return el as T
}

const els: ContactElements = {
  panel: byId('form-container'),
  barLeft: byId('panel-bar-left'),
  barRight: byId('panel-bar-right'),
  modeButtons: Array.from(document.querySelectorAll<HTMLButtonElement>('[data-mode-button]')),
  chatSection: byId('chat-section'),
  detailsSection: byId('contact-form'),
  summaryField: byId('summary-field'),
  messageField: byId('message-field'),
  backToChat: byId('back-to-chat'),
  log: byId('chat-log'),
  input: byId('chat-input'),
  send: byId('chat-send'),
  toSummary: byId('to-summary'),
  remaining: byId('chat-remaining'),
  notice: byId('panel-notice'),
}

const form = byId<HTMLFormElement>('contact-form')
const alertEl = byId('form-alert')
const submitBtn = byId<HTMLButtonElement>('submit-btn')
const categoryEl = byId<HTMLSelectElement>('category')
const summaryEl = byId<HTMLTextAreaElement>('summary')
const messageEl = byId<HTMLTextAreaElement>('message')

const tokens = createTurnstile(byId('turnstile-container'))
const chat = createChatController(tokens)

let state: ContactState = initialState
let detailsShownAt: number | null = null
let summarizedMessageCount = -1

const detailsVisible = (s: ContactState): boolean => s.mode === 'form' || s.step === 'confirm'

function dispatch(action: Action): void {
  const previous = state
  state = reduce(state, action)
  if (detailsVisible(state) && detailsShownAt === null) detailsShownAt = Date.now()
  render(state, previous, els)
}

const setValue = (field: HTMLTextAreaElement | HTMLSelectElement, value: string): void => {
  field.value = value
  field.dispatchEvent(new Event('input'))
}

/** Keeps what the visitor typed when the conversation moves to the plain form. */
function carryOverToForm(): void {
  if (messageEl.value.trim() === '') setValue(messageEl, carryOverText(state))
}

function goUnavailable(notice: string): void {
  dispatch({ type: 'chat-unavailable', notice })
  carryOverToForm()
}

async function sendMessage(): Promise<void> {
  const content = els.input.value.trim()
  if (!content || !canSend(state)) return

  const found = findPii(content)
  if (found.length > 0) {
    const labels = found.map((kind) => PII_LABELS[kind]).join('・')
    dispatch({ type: 'notice', notice: `${labels}が含まれているようです。連絡先は最後の専用欄でお伺いしますので、消してから送信してください。` })
    return
  }

  setValue(els.input, '')
  dispatch({ type: 'user-sent', content })

  const outcome = await chat.send(state.messages, (text) => dispatch({ type: 'assistant-delta', text }))
  if (outcome.kind === 'done') dispatch({ type: 'assistant-done', readyForSummary: outcome.readyForSummary })
  else if (outcome.kind === 'unavailable') goUnavailable(outcome.notice)
  else dispatch({ type: 'turn-rejected', notice: outcome.notice })
}

async function goToSummary(): Promise<void> {
  if (state.pending) return

  // Nothing new was said since the last draft: keep the visitor's edits instead of regenerating.
  if (state.messages.length === summarizedMessageCount) {
    dispatch({ type: 'step', step: 'confirm' })
    return
  }
  dispatch({ type: 'summary-requested' })

  const outcome = await chat.summarize(state.messages)
  if (outcome.kind === 'ready') {
    if (Array.from(categoryEl.options).some((option) => option.value === outcome.category)) setValue(categoryEl, outcome.category)
    setValue(summaryEl, outcome.summary)
    summarizedMessageCount = state.messages.length
    dispatch({ type: 'summary-ready', notice: null })
  } else if (outcome.kind === 'manual') dispatch({ type: 'summary-ready', notice: outcome.notice })
  else if (outcome.kind === 'unavailable') goUnavailable(outcome.notice)
  else dispatch({ type: 'summary-failed', notice: outcome.notice })
}

function readFields(): ContactFields {
  const data = new FormData(form)
  const text = (key: string): string => String(data.get(key) ?? '')
  return { name: text('name'), email: text('email'), category: text('category'), summary: text('summary'), message: text('message'), honey: text('_honey') }
}

/** The server rejects sends under 3s or over 1h after the fields appeared; stay inside that window. */
async function submitTimestamp(): Promise<number> {
  const shownAt = detailsShownAt ?? Date.now()
  const dwell = Date.now() - shownAt
  if (dwell < MIN_DWELL_MS) await new Promise((resolve) => setTimeout(resolve, MIN_DWELL_MS - dwell))
  return Math.max(shownAt, Date.now() - MAX_DWELL_MS)
}

async function submit(event: SubmitEvent): Promise<void> {
  event.preventDefault()
  clearErrors(alertEl)
  setSubmitting(submitBtn, true)

  try {
    const [turnstile, timestamp] = await Promise.all([tokens.getFreshToken(), submitTimestamp()])
    const result = await submitContact(buildPayload(state, readFields(), turnstile, timestamp))

    if (result.ok) {
      els.panel.classList.add('hidden')
      byId('success-container').classList.remove('hidden')
      return
    }
    showFieldErrors(result.details ?? [])
    showAlert(alertEl, result.error)
  } catch (error) {
    showAlert(alertEl, describeTurnstileFailure(error))
  } finally {
    setSubmitting(submitBtn, false)
  }
}

const touchInput = window.matchMedia('(pointer: coarse)').matches

els.input.addEventListener('keydown', (event) => {
  // `isComposing` is true while an IME candidate is being confirmed with Enter.
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing || touchInput) return
  event.preventDefault()
  void sendMessage()
})
els.send.addEventListener('click', () => void sendMessage())
els.toSummary.addEventListener('click', () => void goToSummary())
els.backToChat.addEventListener('click', () => dispatch({ type: 'step', step: 'talk' }))
form.addEventListener('submit', (event) => void submit(event))

for (const button of els.modeButtons) {
  button.addEventListener('click', () => {
    const mode = button.dataset.modeButton === 'form' ? 'form' : 'chat'
    dispatch({ type: 'mode', mode })
    if (mode === 'form') carryOverToForm()
  })
}

render(state, null, els)
