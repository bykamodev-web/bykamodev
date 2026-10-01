import type { ServerEnv } from './server-env.ts'

export const FROM_ADDRESS = 'noreply@bykamo.dev'
export const TO_ADDRESS = 'hello@bykamo.dev'

type EmailBinding = { send: (message: unknown) => Promise<void> }

/** Sends through the `EMAIL` send_email binding. Throws when the binding or the send fails. */
export async function sendContactEmail(env: ServerEnv, mimeContent: string): Promise<void> {
  const binding = env.EMAIL as EmailBinding | undefined
  if (!binding) throw new Error('EMAIL binding is not configured')

  const { EmailMessage } = await import('cloudflare:email')
  await binding.send(new EmailMessage(FROM_ADDRESS, TO_ADDRESS, mimeContent))
}
