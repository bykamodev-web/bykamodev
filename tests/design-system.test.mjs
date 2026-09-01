import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const readSource = (path) => readFile(new URL(path, root), 'utf8')

test('the global stylesheet establishes the Syllabus cream, violet, yellow, and teal tokens', async () => {
  const css = await readSource('src/styles/global.css')

  for (const token of ['#0d0129', '#fae59b', '#19615c', '#fffcf7', '#ffffff']) {
    assert.match(css, new RegExp(token, 'i'))
  }
  assert.match(css, /--radius-cards:\s*0px/)
  assert.match(css, /--shadow-subtle:\s*rgb\(0,\s*0,\s*0\)\s*1px\s*1px\s*3px\s*0px/)
})

test('the home hero uses a yellow primary CTA and a schematic illustration', async () => {
  const hero = await readSource('src/components/sections/Hero.astro')

  assert.match(hero, /class="group btn-primary"/)
  assert.match(hero, /hero-illustration/)
  assert.match(hero, /<svg/)
})

test('the shared header has a distinct ink navigation CTA', async () => {
  const header = await readSource('src/components/layout/Header.astro')

  assert.match(header, /btn-nav/)
  assert.match(header, /href="\/contact"/)
})

test('build detail pages use the CMS cover image and stack the case-study story vertically', async () => {
  const page = await readSource('src/pages/builds/[slug].astro')

  assert.match(page, /getOptimizedImageUrl/)
  assert.match(page, /class="article-cover"/)
  assert.match(page, /<img/)
  assert.doesNotMatch(page, /\.build-story\s*\{\s*grid-template-columns:\s*repeat\(3,/)
})

test('build and note cards retain their entry-specific CMS cover images', async () => {
  const [buildCard, noteCard, notePage] = await Promise.all([
    readSource('src/components/cards/BuildCard.astro'),
    readSource('src/components/cards/NoteCard.astro'),
    readSource('src/pages/notes/[slug].astro'),
  ])

  for (const source of [buildCard, noteCard, notePage]) {
    assert.match(source, /getOptimizedImageUrl/)
    assert.match(source, /<img/)
  }
})

test('status labels have enough padding to remain separate from adjacent topics', async () => {
  const css = await readSource('src/styles/global.css')

  assert.match(css, /min-height:\s*32px/)
  assert.match(css, /padding:\s*6px\s+12px/)
})
