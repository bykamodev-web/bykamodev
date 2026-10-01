import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const readSource = (path) => readFile(new URL(path, root), 'utf8')

test('the final send never imports an AI module', async () => {
  const contact = await readSource('src/pages/api/contact.ts')

  assert.doesNotMatch(contact, /openai-chat|jev-gate|chat-prompt/)
  assert.match(contact, /contactPayloadSchema/)
})

test('the chat client modules cannot see the contact fields', async () => {
  const sources = await Promise.all(
    ['chat-api', 'chat-controller', 'state', 'view'].map((name) => readSource(`src/scripts/contact/${name}.ts`)),
  )

  for (const source of sources) {
    assert.doesNotMatch(source, /['"`#]name['"`]|['"`#]email['"`]|FormData|querySelector/)
  }
})

test('chat requests are built from the session and the conversation only', async () => {
  const api = await readSource('src/scripts/contact/chat-api.ts')

  assert.match(api, /postJson\('\/api\/chat', \{ session, messages \}\)/)
  assert.match(api, /postJson\('\/api\/chat\/summary', \{ session, messages \}\)/)
  assert.match(api, /postJson\('\/api\/chat\/session', \{ turnstile \}\)/)
})

test('OpenAI responses are not stored and the model is pinned', async () => {
  const openai = await readSource('src/lib/contact/openai-chat.ts')

  assert.equal(openai.match(/store: false/g)?.length, 2)
  assert.match(openai, /CHAT_MODEL = 'gpt-6\.1-sol'/)
})

test('the chat sits outside the form and the contact box says what happens to it', async () => {
  const [page, chat, contactFields] = await Promise.all([
    readSource('src/pages/contact/form.astro'),
    readSource('src/components/contact/ChatPanel.astro'),
    readSource('src/components/contact/ContactFields.astro'),
  ])

  assert.ok(page.indexOf('<ChatPanel />') < page.indexOf('<form id="contact-form"'))
  assert.ok(page.indexOf('<ContactFields />') > page.indexOf('<form id="contact-form"'))
  assert.match(page, /api\.js\?render=explicit/)
  assert.doesNotMatch(chat, /name="/)
  assert.match(chat, /OpenAI と TypeSafe に送信されます/)
  assert.match(contactFields, /AI に送信されません/)
})

test('the Turnstile test keys are only reachable under astro dev', async () => {
  const [secrets, page, routes] = await Promise.all([
    readSource('src/pages/api/_secrets.ts'),
    readSource('src/pages/contact/form.astro'),
    Promise.all(['contact', 'chat/session', 'chat/index', 'chat/summary'].map((name) => readSource(`src/pages/api/${name}.ts`))),
  ])

  assert.match(secrets, /import\.meta\.env\.DEV \? TURNSTILE_TEST_KEYS\.secret : getSecret\(env, 'TURNSTILE_SECRET_KEY'/)
  assert.match(page, /import\.meta\.env\.DEV \? TURNSTILE_TEST_KEYS\.siteKey : import\.meta\.env\.TURNSTILE_SITE_KEY/)
  assert.match(secrets, /import\.meta\.env\.DEV \? TURNSTILE_TEST_KEYS\.siteKey : getSecret\(env, 'TURNSTILE_SITE_KEY'/)
  assert.equal(secrets.match(/TURNSTILE_TEST_KEYS\./g)?.length, 2)
  assert.equal(page.match(/TURNSTILE_TEST_KEYS\./g)?.length, 1)
  for (const route of routes) assert.doesNotMatch(route, /TURNSTILE_TEST_KEYS|TURNSTILE_SECRET_KEY/)
})

test('the form works without a build-time site key: the script asks the Worker for it', async () => {
  const [widget, script, route] = await Promise.all([
    readSource('src/components/contact/TurnstileWidget.astro'),
    readSource('src/scripts/contact/turnstile.ts'),
    readSource('src/pages/api/turnstile.ts'),
  ])

  assert.match(widget, /data-sitekey=\{siteKey \?\? ''\}/)
  assert.match(script, /container\.dataset\.sitekey\) return container\.dataset\.sitekey/)
  assert.match(script, /fetch\('\/api\/turnstile'\)/)
  assert.match(route, /turnstileSiteKey\(getEnv\(locals\)\)/)
  assert.match(script, /before-interactive-callback/)
})

test('server secrets from .env.local are only read in dev', async () => {
  const secrets = await readSource('src/pages/api/_secrets.ts')

  for (const key of ['CHAT_SESSION_SECRET', 'OPENAI_API_KEY', 'TYPESAFE_API_KEY']) {
    assert.match(secrets, new RegExp(`import\\.meta\\.env\\.DEV \\? import\\.meta\\.env\\.${key} : undefined`))
  }
})
