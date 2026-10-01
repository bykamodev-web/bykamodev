/** Hard limits for the contact chat. Shared by the browser and the Worker. */

export const MAX_USER_TURNS = 12
export const MIN_USER_TURNS_FOR_SUMMARY = 2
export const MAX_USER_MESSAGE_CHARS = 600
export const MAX_ASSISTANT_MESSAGE_CHARS = 1200
export const MAX_MESSAGES = MAX_USER_TURNS * 2
export const MAX_CONVERSATION_CHARS = 8000

export const SUMMARY_MIN_CHARS = 20
export const SUMMARY_MAX_CHARS = 1000

export const SESSION_TTL_MS = 30 * 60 * 1000
export const TURNSTILE_TOKEN_MAX_CHARS = 2048

/** Includes reasoning tokens. Tune against real `usage` so replies never end `incomplete`. */
export const CHAT_MAX_OUTPUT_TOKENS = 2000
export const SUMMARY_MAX_OUTPUT_TOKENS = 3000

export const JEV_TIMEOUT_MS = 2500

/**
 * Noul probabilities at or above these values block the message.
 * Provisional: confirm against tests/fixtures/jev-ja.json with scripts/jev-eval.ts.
 */
export const JEV_THRESHOLDS = {
  person_name: 0.7,
  postal_address: 0.7,
  off_topic: 0.8,
  jailbreak: 0.8,
} as const

/** Site-wide ceiling on AI calls per UTC day (Rate Limiting windows are 60s at most). */
export const DAILY_AI_CALL_LIMIT = 300
