import { GREETING } from '../../lib/contact/greeting.ts'
import { canSend, remainingTurns, type ContactState } from './state.ts'

/** Paints the page from state. Model and visitor text only ever goes through `textContent`. */

export interface ContactElements {
  panel: HTMLElement
  barLeft: HTMLElement
  barRight: HTMLElement
  modeButtons: ReadonlyArray<HTMLButtonElement>
  chatSection: HTMLElement
  detailsSection: HTMLElement
  summaryField: HTMLElement
  messageField: HTMLElement
  backToChat: HTMLButtonElement
  log: HTMLElement
  input: HTMLTextAreaElement
  send: HTMLButtonElement
  toSummary: HTMLButtonElement
  remaining: HTMLElement
  notice: HTMLElement
}

const SPEAKER = { user: 'YOU', assistant: 'AI' } as const
const OUT_OF_TURNS = 'やり取りの上限に達しました。「要約へ進む」を押してください。'
const PLACEHOLDER = '例: 請求書の処理を自動化したい'

const BAR: Record<string, readonly [string, string]> = {
  'chat:talk': ['CHAT — 01 / 03 TALK', 'AI ASSISTED'],
  'chat:confirm': ['CHAT — 02 / 03 CONFIRM', 'REVIEW & EDIT'],
  'form:talk': ['FORM — 04 FIELDS', 'ALL REQUIRED'],
  'form:confirm': ['FORM — 04 FIELDS', 'ALL REQUIRED'],
}

function bubble(role: 'user' | 'assistant', text: string, modifier = ''): HTMLElement {
  const item = document.createElement('li')
  item.className = `chat-bubble chat-bubble--${role} ${modifier}`.trim()

  const who = document.createElement('span')
  who.className = 'chat-bubble__who'
  who.textContent = SPEAKER[role]

  const body = document.createElement('p')
  body.className = 'chat-bubble__text'
  body.textContent = text

  item.append(who, body)
  return item
}

function typingBubble(): HTMLElement {
  const item = bubble('assistant', '', 'chat-bubble--typing')
  const dots = document.createElement('span')
  dots.className = 'chat-typing'
  dots.setAttribute('aria-label', '入力中')
  dots.append(...Array.from({ length: 3 }, () => document.createElement('i')))
  item.lastElementChild?.replaceChildren(dots)
  return item
}

function renderLog(log: HTMLElement, state: ContactState): void {
  const live = state.streaming ? [bubble('assistant', state.streaming)] : state.pending && state.step === 'talk' ? [typingBubble()] : []
  log.replaceChildren(bubble('assistant', GREETING), ...state.messages.map((m) => bubble(m.role, m.content)), ...live)
  log.scrollTop = log.scrollHeight
}

const toggle = (el: HTMLElement, visible: boolean): void => {
  el.classList.toggle('hidden', !visible)
}

export function render(state: ContactState, previous: ContactState | null, els: ContactElements): void {
  const showChat = state.mode === 'chat' && state.step === 'talk'
  const [left, right] = BAR[`${state.mode}:${state.step}`]

  els.panel.dataset.mode = state.mode
  els.barLeft.textContent = left
  els.barRight.textContent = right

  for (const button of els.modeButtons) {
    const active = button.dataset.modeButton === state.mode
    button.setAttribute('aria-pressed', String(active))
    button.disabled = button.dataset.modeButton === 'chat' && !state.chatAvailable
  }

  toggle(els.chatSection, showChat)
  toggle(els.detailsSection, !showChat)
  toggle(els.summaryField, state.mode === 'chat')
  toggle(els.messageField, state.mode === 'form')
  toggle(els.backToChat, state.mode === 'chat' && remainingTurns(state) > 0)

  renderLog(els.log, state)

  const sendable = canSend(state)
  const outOfTurns = remainingTurns(state) === 0
  els.input.disabled = !sendable
  els.input.placeholder = outOfTurns ? OUT_OF_TURNS : PLACEHOLDER
  els.send.disabled = !sendable
  els.remaining.textContent = `あと ${remainingTurns(state)} 回`
  toggle(els.toSummary, state.readyForSummary)
  els.toSummary.disabled = state.pending

  els.notice.textContent = state.notice ?? ''
  toggle(els.notice, state.notice !== null)

  // A rejected turn hands its text back so the visitor can edit instead of retyping.
  if (state.draft && state.draft !== previous?.draft) {
    els.input.value = state.draft
    els.input.dispatchEvent(new Event('input'))
  }
  if (sendable && previous?.pending) els.input.focus()
}
