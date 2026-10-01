import { z } from 'zod'
import { CATEGORY_VALUES } from './contact/categories.ts'
import { chatMessageSchema, conversationIssues } from './contact/chat-schema.ts'
import { MAX_MESSAGES, SUMMARY_MAX_CHARS, SUMMARY_MIN_CHARS } from './contact/limits.ts'

export { CATEGORIES, getCategoryLabel } from './contact/categories.ts'

const common = {
  name: z
    .string()
    .min(1, 'お名前を入力してください')
    .max(100, '100文字以内で入力してください')
    .regex(/^[^\r\n]*$/, 'お名前に改行は使えません'),
  email: z.email('有効なメールアドレスを入力してください'),
  category: z.enum(CATEGORY_VALUES, { error: 'ご相談の種類を選択してください' }),
  _timestamp: z.number(),
  _honey: z.string().max(0, 'Invalid request'),
  _turnstile: z.string().min(1, '認証を完了してください'),
}

const formPayloadSchema = z.strictObject({
  mode: z.literal('form'),
  ...common,
  message: z.string().min(10, '10文字以上で入力してください').max(2000, '2000文字以内で入力してください'),
})

const chatPayloadSchema = z.strictObject({
  mode: z.literal('chat'),
  ...common,
  summary: z
    .string()
    .trim()
    .min(SUMMARY_MIN_CHARS, `${SUMMARY_MIN_CHARS}文字以上で入力してください`)
    .max(SUMMARY_MAX_CHARS, `${SUMMARY_MAX_CHARS}文字以内で入力してください`),
  transcript: z
    .array(chatMessageSchema)
    .min(2)
    .max(MAX_MESSAGES)
    .superRefine((messages, ctx) => {
      for (const issue of conversationIssues(messages)) ctx.addIssue({ code: 'custom', message: issue.message })
    }),
})

/** A payload without `mode` comes from a page loaded before this deploy: treat it as the form. */
const withDefaultMode = (value: unknown): unknown =>
  value && typeof value === 'object' && !Array.isArray(value) && !('mode' in value) ? { ...value, mode: 'form' } : value

export const contactPayloadSchema = z.preprocess(
  withDefaultMode,
  z.discriminatedUnion('mode', [formPayloadSchema, chatPayloadSchema]),
)

export type ContactPayload = z.infer<typeof contactPayloadSchema>
