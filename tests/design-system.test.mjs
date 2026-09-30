import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const readSource = (path) => readFile(new URL(path, root), 'utf8')

const readStyles = async () => {
  const files = ['global', 'tokens', 'base', 'components', 'motion', 'rich-content']
  const sources = await Promise.all(files.map((name) => readSource(`src/styles/${name}.css`).catch(() => '')))
  return sources.join('\n')
}

test('the global stylesheet establishes the Syllabus cream, violet, yellow, and teal tokens', async () => {
  const css = await readSource('src/styles/global.css')

  for (const token of ['#0d0129', '#fae59b', '#19615c', '#fffcf7', '#ffffff']) {
    assert.match(css, new RegExp(token, 'i'))
  }
  assert.match(css, /--radius-cards:\s*0px/)
  assert.match(css, /--shadow-subtle:\s*rgb\(0,\s*0,\s*0\)\s*1px\s*1px\s*3px\s*0px/)
})

test('the home hero uses a yellow primary CTA and a schematic illustration', async () => {
  const [hero, illustration] = await Promise.all([
    readSource('src/components/sections/Hero.astro'),
    readSource('src/components/sections/HeroIllustration.astro'),
  ])

  assert.match(hero, /class="group btn-primary"/)
  assert.match(hero, /<HeroIllustration/)
  assert.match(illustration, /hero-illustration/)
  assert.match(illustration, /<svg/)
  assert.match(illustration, /data-part/)
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
  const css = await readStyles()

  assert.match(css, /min-height:\s*32px/)
  assert.match(css, /padding:\s*6px\s+12px/)
})


test('the stylesheet partials keep badge geometry and define the extended type, motion and shadow scale', async () => {
  const [global, css] = await Promise.all([readSource('src/styles/global.css'), readStyles()])

  for (const partial of ['tokens', 'base', 'components', 'motion', 'rich-content']) {
    assert.match(global, new RegExp(`@import\\s+["']\\./${partial}\\.css["']`))
  }
  assert.match(css, /min-height:\s*32px/)
  assert.match(css, /padding:\s*6px\s+12px/)
  for (const token of ['--text-mega', '--text-display-xl', '--ease-out', '--ease-in-out', '--dur-3', '--shadow-hard', '--shadow-hard-lg', '--gutter']) {
    assert.match(css, new RegExp(`${token}:`))
  }
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/)
  assert.match(css, /html\.js\s[^{]*\[data-reveal/)
})

test('the head loads Hanken Grotesk, Zen Kaku Gothic New and JetBrains Mono and flags JS before paint', async () => {
  const head = await readSource('src/components/seo/BaseHead.astro')

  for (const family of ['Hanken\\+Grotesk', 'Zen\\+Kaku\\+Gothic\\+New', 'JetBrains\\+Mono']) {
    assert.match(head, new RegExp(family))
  }
  assert.match(head, /classList\.add\(['"]js['"]\)/)
})

test('the layout enables client-side routing and one motion entry point that respects reduced motion', async () => {
  const [layout, motion, env] = await Promise.all([
    readSource('src/layouts/BaseLayout.astro'),
    readSource('src/scripts/motion/index.ts'),
    readSource('src/scripts/motion/env.ts'),
  ])

  assert.match(layout, /<ClientRouter/)
  assert.match(layout, /scripts\/motion/)
  assert.match(motion, /astro:page-load/)
  assert.match(motion, /astro:before-swap/)
  assert.match(env, /prefers-reduced-motion:\s*reduce/)
})

test('links into the contact form force a full page load for Turnstile', async () => {
  const files = ['src/pages/contact/index.astro', 'src/components/layout/Header.astro', 'src/components/sections/ContactCta.astro', 'src/components/layout/Footer.astro']
  const sources = await Promise.all(files.map(readSource))

  for (const source of sources) {
    for (const [tag] of source.matchAll(/<a\b[^>]*href="\/contact\/form"[^>]*>/g)) {
      assert.match(tag, /data-astro-reload/)
    }
  }
  assert.match(sources[0], /href="\/contact\/form"[^>]*data-astro-reload|data-astro-reload[^>]*href="\/contact\/form"/)
})

test('shared motion components render masked lines, markers and a seamless marquee', async () => {
  const [lines, pageHero, marquee, hero] = await Promise.all([
    readSource('src/components/ui/RevealLines.astro'),
    readSource('src/components/ui/PageHero.astro'),
    readSource('src/components/ui/Marquee.astro'),
    readSource('src/components/sections/Hero.astro'),
  ])

  assert.match(lines, /line__inner/)
  assert.match(lines, /marker/)
  assert.match(pageHero, /RevealLines/)
  assert.match(marquee, /aria-hidden="true"/)
  assert.match(hero, /RevealLines/)
  assert.match(hero, /data-magnetic/)
})

test('a noindex 404 page exists', async () => {
  const page = await readSource('src/pages/404.astro')

  assert.match(page, /noindex/)
  assert.match(page, /404/)
})

test('collection and detail pages read as editorial rows, a fact sheet and an auto table of contents', async () => {
  const [notesIndex, buildPage, notePage, tocModule, motion, rich] = await Promise.all([
    readSource('src/pages/notes/index.astro'),
    readSource('src/pages/builds/[slug].astro'),
    readSource('src/pages/notes/[slug].astro'),
    readSource('src/scripts/motion/toc.ts'),
    readSource('src/scripts/motion/index.ts'),
    readSource('src/styles/rich-content.css'),
  ])

  assert.match(notesIndex, /<NoteList/)
  assert.match(buildPage, /<FactSheet/)
  assert.match(buildPage, /<StorySection/)
  assert.match(notePage, /<Toc/)
  assert.match(notePage, /embedYouTube\(note\.body\)/)
  assert.match(tocModule, /prefersReducedMotion/)
  assert.match(tocModule, /IntersectionObserver/)
  assert.match(motion, /initToc/)
  assert.match(rich, /\.yt-embed--vertical/)
  assert.match(rich, /overflow-x:\s*auto/)
})

test('home polish: glyph-safe marker, fact-list section headers, full wordmark and pointer-following preview', async () => {
  const [css, builds, notes, footer, preview] = await Promise.all([
    readStyles(),
    readSource('src/components/sections/FeaturedBuilds.astro'),
    readSource('src/components/sections/FeaturedNotes.astro'),
    readSource('src/components/layout/Footer.astro'),
    readSource('src/scripts/motion/notes-preview.ts'),
  ])

  assert.match(css, /\.marker::before\s*\{[^}]*height:\s*1\.12em/)
  assert.match(css, /\.fact-list\s*\{/)
  for (const source of [builds, notes]) assert.match(source, /class="fact-list"/)
  assert.doesNotMatch(footer, /margin-bottom:\s*-0\.16em/)
  assert.match(preview, /clientY/)
})
