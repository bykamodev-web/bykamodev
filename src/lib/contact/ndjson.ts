import { MAX_ASSISTANT_MESSAGE_CHARS } from './limits.ts'

/** Wire format of POST /api/chat: one JSON event per line. Shared by the Worker and the browser. */

export type ChatStreamEvent =
  | { type: 'delta'; text: string }
  /** `sig` signs the whole reply; the browser sends it back with the reply on later turns. */
  | { type: 'done'; readyForSummary: boolean; sig: string }
  | { type: 'error'; error: string; code: string }

export const UPSTREAM_ERROR_MESSAGE = 'AI の応答を取得できませんでした。もう一度送るか、フォームから直接お送りください。'

export function encodeEvent(event: ChatStreamEvent): string {
  return `${JSON.stringify(event)}\n`
}

function parseLine(line: string): ChatStreamEvent[] {
  try {
    const value: unknown = JSON.parse(line)
    return value && typeof value === 'object' && 'type' in value ? [value as ChatStreamEvent] : []
  } catch {
    // A malformed line is dropped; the stream's closing event still decides the outcome.
    return []
  }
}

/** Pure incremental parser: feed it the carried-over `rest` and the next chunk. */
export function parseNdjson(rest: string, chunk: string): { events: ChatStreamEvent[]; rest: string } {
  const lines = (rest + chunk).split('\n')
  const complete = lines.slice(0, -1).filter((line) => line.trim().length > 0)
  return { events: complete.flatMap(parseLine), rest: lines.at(-1) ?? '' }
}

/**
 * Turns model text deltas into the NDJSON body. The reply is cut at the length later
 * requests accept, then signed. Upstream errors become one generic `error` event.
 */
export function chatEventStream(
  deltas: AsyncIterable<string>,
  closing: { readyForSummary: boolean; sign: (reply: string) => Promise<string> },
  onCancel?: () => void,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const send = (controller: ReadableStreamDefaultController<Uint8Array>, event: ChatStreamEvent): void =>
    controller.enqueue(encoder.encode(encodeEvent(event)))

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let reply = ''
        for await (const delta of deltas) {
          const text = delta.slice(0, MAX_ASSISTANT_MESSAGE_CHARS - reply.length)
          if (text) send(controller, { type: 'delta', text })
          reply += text
          if (reply.length >= MAX_ASSISTANT_MESSAGE_CHARS) {
            onCancel?.()
            break
          }
        }
        send(controller, { type: 'done', readyForSummary: closing.readyForSummary, sig: await closing.sign(reply) })
      } catch (error) {
        console.error('Chat stream failed:', error)
        send(controller, { type: 'error', error: UPSTREAM_ERROR_MESSAGE, code: 'upstream_error' })
      } finally {
        controller.close()
      }
    },
    cancel() {
      onCancel?.()
    },
  })
}
