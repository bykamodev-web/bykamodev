import { z } from 'zod'

export const CATEGORIES = [
  { value: 'ai-implementation', label: 'AI実装の相談' },
  { value: 'automation', label: '自動化の相談' },
  { value: 'product-dev', label: 'プロダクト開発' },
  { value: 'other', label: 'その他' },
] as const

const categoryValues = CATEGORIES.map((c) => c.value) as unknown as [string, ...string[]]

export const contactFormSchema = z.object({
  name: z.string().min(1, 'お名前を入力してください').max(100, '100文字以内で入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  category: z.enum(categoryValues, { errorMap: () => ({ message: 'ご相談の種類を選択してください' }) }),
  message: z.string().min(10, '10文字以上で入力してください').max(2000, '2000文字以内で入力してください'),
  _timestamp: z.number(),
  _honey: z.string().max(0, 'Invalid request'),
  _turnstile: z.string().min(1, '認証を完了してください'),
})

export type ContactFormInput = z.infer<typeof contactFormSchema>

export function getCategoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value
}
