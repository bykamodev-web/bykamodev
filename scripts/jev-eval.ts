/**
 * Checks the Jev gate against Japanese examples and prints every probability, so the
 * thresholds in src/lib/contact/limits.ts can be set from data instead of a guess.
 *
 *   node --env-file=.env.local scripts/jev-eval.ts
 *
 * Not part of `pnpm test`: it calls the TypeSafe API and needs TYPESAFE_API_KEY.
 */
import { readFile } from 'node:fs/promises'
import type { ChatMessage } from '../src/lib/contact/chat-schema.ts'
import { buildJevRequest, decideGate } from '../src/lib/contact/jev-gate.ts'
import { JEV_THRESHOLDS } from '../src/lib/contact/limits.ts'

type Fixture = { label: string; block: 'pii_suspected' | 'off_topic' | null; prev: string; text: string }
type Row = { fixture: Fixture; nouls: Record<string, number>; verdict: string | null; ms: number; model: string }

const ENDPOINT = 'https://api.typesafe.ai/v1/systemone'
const IDS = Object.keys(JEV_THRESHOLDS) as Array<keyof typeof JEV_THRESHOLDS>

const apiKey = process.env.TYPESAFE_API_KEY
if (!apiKey) {
  process.stderr.write('TYPESAFE_API_KEY is not set. Run: node --env-file=.env.local scripts/jev-eval.ts\n')
  process.exit(1)
}

const toMessages = (fixture: Fixture): ChatMessage[] =>
  fixture.prev
    ? [{ role: 'user', content: '相談があります' }, { role: 'assistant', content: fixture.prev }, { role: 'user', content: fixture.text }]
    : [{ role: 'user', content: fixture.text }]

async function evaluate(fixture: Fixture): Promise<Row> {
  const startedAt = performance.now()
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buildJevRequest(toMessages(fixture), 'chat')),
  })
  if (!res.ok) throw new Error(`Jev responded ${res.status} for "${fixture.label}"`)

  const data = (await res.json()) as { model?: string; answers?: Record<string, { noul?: number }> }
  const verdict = decideGate(data.answers)
  return {
    fixture,
    nouls: Object.fromEntries(IDS.map((id) => [id, data.answers?.[id]?.noul ?? 0])),
    verdict: verdict.allow ? null : verdict.reason,
    ms: Math.round(performance.now() - startedAt),
    model: data.model ?? 'unknown',
  }
}

const fixtures = JSON.parse(await readFile(new URL('../tests/fixtures/jev-ja.json', import.meta.url), 'utf8')) as Fixture[]

const rows: Row[] = []
for (const fixture of fixtures) rows.push(await evaluate(fixture))

const cell = (value: number): string => value.toFixed(2).padStart(5)
const lines = rows.map((row) => {
  const ok = row.verdict === row.fixture.block
  return `${ok ? 'ok  ' : 'MISS'} ${IDS.map((id) => cell(row.nouls[id])).join(' ')}  ${String(row.ms).padStart(5)}ms  ${(row.verdict ?? 'pass').padEnd(13)} ${row.fixture.label}`
})

const wronglyBlocked = rows.filter((row) => row.fixture.block === null && row.verdict !== null)
const wronglyPassed = rows.filter((row) => row.fixture.block !== null && row.verdict === null)
const latencies = rows.map((row) => row.ms).sort((a, b) => a - b)

process.stdout.write(
  [
    `model: ${rows[0]?.model}   thresholds: ${JSON.stringify(JEV_THRESHOLDS)}`,
    `     ${IDS.map((id) => id.slice(0, 5).padStart(5)).join(' ')}`,
    ...lines,
    '',
    `legitimate messages blocked: ${wronglyBlocked.length} / ${rows.filter((row) => row.fixture.block === null).length}`,
    `messages that should be blocked but passed: ${wronglyPassed.length} / ${rows.filter((row) => row.fixture.block !== null).length}`,
    `latency: median ${latencies[Math.floor(latencies.length / 2)]}ms, max ${latencies.at(-1)}ms`,
    '',
  ].join('\n'),
)
