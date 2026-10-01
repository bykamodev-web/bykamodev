import type { SignedChatMessage } from '../../lib/contact/chat-schema.ts'
import { FORM_MESSAGE_MAX_CHARS, MAX_ASSISTANT_MESSAGE_CHARS, MAX_CONVERSATION_CHARS, MAX_USER_TURNS } from '../../lib/contact/limits.ts'

/** Page state for /contact/form. Pure: every action returns a new state. */

export type Mode = 'chat' | 'form'
export type Step = 'talk' | 'confirm'

export interface ContactState {
  readonly mode: Mode
  readonly step: Step
  /** Settled turns, plus the user message still waiting for its reply. */
  readonly messages: ReadonlyArray<SignedChatMessage>
  readonly pending: boolean
  /** The reply being streamed, not yet part of `messages`. */
  readonly streaming: string
  readonly readyForSummary: boolean
  readonly chatAvailable: boolean
  readonly notice: string | null
  /** Text handed back to the input after a rejected turn. */
  readonly draft: string
}

export type Action =
  | { type: 'mode'; mode: Mode }
  | { type: 'step'; step: Step }
  | { type: 'user-sent'; content: string }
  | { type: 'assistant-delta'; text: string }
  | { type: 'assistant-done'; readyForSummary: boolean; sig: string }
  | { type: 'turn-rejected'; notice: string }
  | { type: 'summary-requested' }
  | { type: 'summary-ready'; notice: string | null }
  | { type: 'summary-failed'; notice: string }
  | { type: 'chat-unavailable'; notice: string }
  | { type: 'notice'; notice: string | null }

export const initialState: ContactState = {
  mode: 'chat',
  step: 'talk',
  messages: [],
  pending: false,
  streaming: '',
  readyForSummary: false,
  chatAvailable: true,
  notice: null,
  draft: '',
}

const userTurns = (state: ContactState): number => state.messages.filter((m) => m.role === 'user').length
const conversationChars = (state: ContactState): number => state.messages.reduce((total, m) => total + m.content.length, 0)

export function remainingTurns(state: ContactState): number {
  return Math.max(MAX_USER_TURNS - userTurns(state), 0)
}

/**
 * Characters the next message may use. One full-length reply is held in reserve, so the
 * conversation still fits the server's limit once that reply arrives.
 */
export function remainingChars(state: ContactState): number {
  return Math.max(MAX_CONVERSATION_CHARS - MAX_ASSISTANT_MESSAGE_CHARS - conversationChars(state), 0)
}

/** True once another message cannot be sent: out of turns, or out of room. */
export function chatClosed(state: ContactState): boolean {
  return remainingTurns(state) === 0 || remainingChars(state) === 0
}

export function canSend(state: ContactState): boolean {
  return state.mode === 'chat' && state.step === 'talk' && !state.pending && !chatClosed(state)
}

/** What the visitor wrote, cut to what the plain form accepts, for when the chat cannot continue. */
export function carryOverText(state: ContactState): string {
  return state.messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join('\n')
    .slice(0, FORM_MESSAGE_MAX_CHARS)
}

/** Drops a trailing user message that never got its reply. */
function withoutUnanswered(messages: ReadonlyArray<SignedChatMessage>): { messages: ReadonlyArray<SignedChatMessage>; dropped: string } {
  const last = messages.at(-1)
  return last?.role === 'user' ? { messages: messages.slice(0, -1), dropped: last.content } : { messages, dropped: '' }
}

function settleReply(state: ContactState, action: { readyForSummary: boolean; sig: string }): ContactState {
  const settled: ContactState = {
    ...state,
    messages: [...state.messages, { role: 'assistant', content: state.streaming, sig: action.sig }],
    pending: false,
    streaming: '',
  }
  return { ...settled, readyForSummary: action.readyForSummary || chatClosed(settled) }
}

export function reduce(state: ContactState, action: Action): ContactState {
  switch (action.type) {
    case 'mode':
      return action.mode === 'chat' && !state.chatAvailable ? state : { ...state, mode: action.mode, notice: null }
    case 'step':
      return { ...state, step: action.step, notice: null }
    case 'user-sent':
      return { ...state, messages: [...state.messages, { role: 'user', content: action.content }], pending: true, streaming: '', notice: null, draft: '' }
    case 'assistant-delta':
      return { ...state, streaming: state.streaming + action.text }
    case 'assistant-done':
      return settleReply(state, action)
    case 'turn-rejected': {
      const { messages, dropped } = withoutUnanswered(state.messages)
      return { ...state, messages, pending: false, streaming: '', notice: action.notice, draft: dropped }
    }
    case 'summary-requested':
      return { ...state, pending: true, notice: null }
    case 'summary-ready':
      return { ...state, pending: false, step: 'confirm', notice: action.notice }
    case 'summary-failed':
      return { ...state, pending: false, notice: action.notice }
    case 'chat-unavailable':
      return { ...state, mode: 'form', chatAvailable: false, pending: false, streaming: '', notice: action.notice }
    case 'notice':
      return { ...state, notice: action.notice }
  }
}
