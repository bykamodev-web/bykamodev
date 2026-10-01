import { z } from 'zod'
import { CATEGORY_VALUES } from './categories.ts'
import {
  MAX_ASSISTANT_MESSAGE_CHARS,
  MAX_CONVERSATION_CHARS,
  MAX_MESSAGES,
  MAX_USER_MESSAGE_CHARS,
  MAX_USER_TURNS,
  MIN_USER_TURNS_FOR_SUMMARY,
  SUMMARY_MAX_CHARS,
  TURNSTILE_TOKEN_MAX_CHARS,
} from './limits.ts'

/**
 * Every schema here is strict: a request that carries `name`, `email` or any other
 * extra key is rejected, so contact details cannot ride along to an AI endpoint.
 */

export const chatMessageSchema = z.discriminatedUnion('role', [
  z.strictObject({
    role: z.literal('user'),
    content: z.string().trim().min(1, 'メッセージを入力してください').max(MAX_USER_MESSAGE_CHARS, `${MAX_USER_MESSAGE_CHARS}文字以内で入力してください`),
  }),
  z.strictObject({
    role: z.literal('assistant'),
    content: z.string().min(1).max(MAX_ASSISTANT_MESSAGE_CHARS),
  }),
])

export type ChatMessage = z.infer<typeof chatMessageSchema>

export function countUserTurns(messages: ReadonlyArray<{ role: string }>): number {
  return messages.filter((m) => m.role === 'user').length
}

export function conversationLength(messages: ReadonlyArray<{ content: string }>): number {
  return messages.reduce((total, m) => total + m.content.length, 0)
}

type Issue = { message: string }

/** Conversations start with the user and strictly alternate. */
export function conversationIssues(messages: ReadonlyArray<ChatMessage>): Issue[] {
  const outOfOrder = messages.some((m, i) => m.role !== (i % 2 === 0 ? 'user' : 'assistant'))
  return [
    ...(outOfOrder ? [{ message: '会話の順序が正しくありません' }] : []),
    ...(countUserTurns(messages) > MAX_USER_TURNS ? [{ message: `やり取りは${MAX_USER_TURNS}回までです` }] : []),
    ...(conversationLength(messages) > MAX_CONVERSATION_CHARS ? [{ message: '会話が長すぎます' }] : []),
  ]
}

const messagesSchema = z.array(chatMessageSchema).min(1).max(MAX_MESSAGES)

const addIssues = (ctx: z.RefinementCtx, issues: Issue[]): void => {
  for (const issue of issues) ctx.addIssue({ code: 'custom', path: ['messages'], message: issue.message })
}

export const sessionRequestSchema = z.strictObject({
  turnstile: z.string().min(1, '認証を完了してください').max(TURNSTILE_TOKEN_MAX_CHARS),
})

export const chatRequestSchema = z
  .strictObject({ session: z.string().min(1).max(512), messages: messagesSchema })
  .superRefine((value, ctx) => {
    const tailIsUser = value.messages.at(-1)?.role === 'user'
    addIssues(ctx, [
      ...conversationIssues(value.messages),
      ...(tailIsUser ? [] : [{ message: '最後のメッセージは相談者のものである必要があります' }]),
    ])
  })

export const summaryRequestSchema = z
  .strictObject({ session: z.string().min(1).max(512), messages: messagesSchema })
  .superRefine((value, ctx) => {
    const enoughTurns = countUserTurns(value.messages) >= MIN_USER_TURNS_FOR_SUMMARY
    addIssues(ctx, [
      ...conversationIssues(value.messages),
      ...(enoughTurns ? [] : [{ message: 'もう少しお話を聞かせてください' }]),
    ])
  })

export type ChatRequest = z.infer<typeof chatRequestSchema>

/** What the model returns for a summary. Length is trimmed by the caller, not rejected. */
export const summaryResultSchema = z.object({
  category: z.enum(CATEGORY_VALUES),
  summary: z.string().trim().min(1).transform((s) => s.slice(0, SUMMARY_MAX_CHARS)),
})

export type SummaryResult = z.infer<typeof summaryResultSchema>
