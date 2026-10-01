import OpenAI from 'openai'
import { CHAT_INSTRUCTIONS, FINAL_TURN_NOTE, SUMMARY_INSTRUCTIONS, SUMMARY_JSON_SCHEMA } from './chat-prompt.ts'
import { summaryResultSchema, type ChatMessage, type SummaryResult } from './chat-schema.ts'
import { CHAT_MAX_OUTPUT_TOKENS, SUMMARY_MAX_OUTPUT_TOKENS } from './limits.ts'

/**
 * The only module that talks to OpenAI. It receives the conversation and nothing else:
 * the visitor's name and e-mail never reach this file.
 */

export const CHAT_MODEL = 'gpt-6.1-sol'

const REQUEST_TIMEOUT_MS = 20_000
const SPEAKER = { user: '相談者', assistant: 'AI' } as const

type StreamEvent = { type: string; delta?: unknown }

/** The slice of the SDK this module uses, so tests can pass a fake. */
export interface ResponsesClient {
  responses: {
    create(params: Record<string, unknown>, options?: { signal?: AbortSignal }): Promise<unknown>
  }
}

export class ChatUpstreamError extends Error {}

export function createOpenAIClient(apiKey: string): ResponsesClient {
  return new OpenAI({ apiKey, maxRetries: 1, timeout: REQUEST_TIMEOUT_MS }) as unknown as ResponsesClient
}

export async function* streamChatReply(
  client: ResponsesClient,
  messages: ReadonlyArray<ChatMessage>,
  options: { finalTurn: boolean; signal?: AbortSignal },
): AsyncGenerator<string> {
  const stream = (await client.responses.create(
    {
      model: CHAT_MODEL,
      instructions: options.finalTurn ? `${CHAT_INSTRUCTIONS}\n\n${FINAL_TURN_NOTE}` : CHAT_INSTRUCTIONS,
      input: messages.map((m) => ({ role: m.role, content: m.content })),
      reasoning: { effort: 'low' },
      max_output_tokens: CHAT_MAX_OUTPUT_TOKENS,
      store: false,
      stream: true,
    },
    { signal: options.signal },
  )) as AsyncIterable<StreamEvent>

  let produced = false
  for await (const event of stream) {
    if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') {
      produced = true
      yield event.delta
    } else if (event.type === 'response.failed' || event.type === 'error' || event.type === 'response.refusal.delta') {
      throw new ChatUpstreamError(`OpenAI stream ended with ${event.type}`)
    }
  }

  // `response.incomplete` with no text means the token budget went to reasoning.
  if (!produced) throw new ChatUpstreamError('OpenAI returned no text')
}

function transcriptOf(messages: ReadonlyArray<ChatMessage>): string {
  return messages.map((m) => `[${SPEAKER[m.role]}] ${m.content}`).join('\n')
}

export async function generateSummary(client: ResponsesClient, messages: ReadonlyArray<ChatMessage>): Promise<SummaryResult> {
  const response = (await client.responses.create({
    model: CHAT_MODEL,
    instructions: SUMMARY_INSTRUCTIONS,
    input: [{ role: 'user', content: `<transcript>\n${transcriptOf(messages)}\n</transcript>` }],
    reasoning: { effort: 'low' },
    max_output_tokens: SUMMARY_MAX_OUTPUT_TOKENS,
    store: false,
    text: { format: { type: 'json_schema', name: 'contact_summary', strict: true, schema: SUMMARY_JSON_SCHEMA } },
  })) as { output_text?: string }

  try {
    return summaryResultSchema.parse(JSON.parse(response.output_text ?? ''))
  } catch (error) {
    throw new ChatUpstreamError('OpenAI returned an unusable summary', { cause: error })
  }
}
