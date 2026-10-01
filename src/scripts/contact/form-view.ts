import type { FieldIssue } from './request.ts'

/** Field errors and the alert under the send button. Hooks: `[data-error]`, `#form-alert`. */

export function clearErrors(alertEl: HTMLElement): void {
  document.querySelectorAll('.form-error').forEach((el) => {
    el.textContent = ''
  })
  alertEl.classList.add('hidden')
  alertEl.textContent = ''
}

export function showFieldErrors(details: ReadonlyArray<FieldIssue>): void {
  for (const { field, message } of details) {
    const el = document.querySelector(`[data-error="${CSS.escape(field)}"]`)
    if (el) el.textContent = message
  }
}

export function showAlert(alertEl: HTMLElement, message: string): void {
  alertEl.textContent = message
  alertEl.classList.remove('hidden')
}

export function setSubmitting(button: HTMLButtonElement, submitting: boolean): void {
  button.disabled = submitting
  button.textContent = submitting ? '送信中...' : '送信する'
}
