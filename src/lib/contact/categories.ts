export const CATEGORIES = [
  { value: 'ai-implementation', label: 'AI実装の相談' },
  { value: 'automation', label: '自動化の相談' },
  { value: 'product-dev', label: 'プロダクト開発' },
  { value: 'other', label: 'その他' },
] as const

export type CategoryValue = (typeof CATEGORIES)[number]['value']

export const CATEGORY_VALUES = CATEGORIES.map((c) => c.value) as [CategoryValue, ...CategoryValue[]]

export function getCategoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value
}
