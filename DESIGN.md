# bykamo.dev — Syllabus-inspired design system ("Working Drawing" edition)

bykamo.dev is a warm editorial-tech portfolio. The page is cream paper, its structure is near-black violet, and the only raised voice is a buttery-yellow CTA with a hard offset shadow. Treat every product graphic as flat schematic line-art, never a glossy dashboard or photograph.

The concept is **組み直す / Reassemble — the site is a working drawing.** Scattered parts snap into an ordered system. Blueprint hairlines, index numbers `(01) —`, mono annotations and a yellow highlighter are the recurring vocabulary.

## Core tokens

| Token | Value | Use |
| --- | --- | --- |
| `--color-ink-violet` | `#0d0129` | Text, all 1px borders, line-art strokes, dark finale ground |
| `--color-butter-yellow` | `#fae59b` | Primary CTAs, highlighter marker, small illustration fills |
| `--color-deep-teal` | `#19615c` | Full-bleed contrast sections, live status dot |
| `--color-cream-paper` | `#fffcf7` | Page canvas, text on dark grounds |
| `--color-pure-white` | `#ffffff` | Inset cards, panels, image frames |
| `--shadow-subtle` | `rgb(0, 0, 0) 1px 1px 3px 0px` | Yellow CTA at rest only |
| `--shadow-hard` / `--shadow-hard-lg` | `4px 4px 0 0` / `8px 8px 0 0` ink | Hover lift for buttons / frames. Flat, never blurred |

Tokens live in `src/styles/global.css` (core) and `src/styles/tokens.css` (scales). Partials: `base.css`, `components.css`, `motion.css`, `rich-content.css`.

## Type and layout

- Fonts: `--font-roobert` = Roobert → **Hanken Grotesk** (Latin) → **Zen Kaku Gothic New** (Japanese); `--font-supply` = Supply → **JetBrains Mono**.
- Fluid display scale: `--text-mega` `clamp(56px, 9.2vw, 148px)` (home hero only, capped at 132px), `--text-display-xl` `clamp(44px, 6.4vw, 104px)` (section / page heroes), `--text-display` `clamp(36px, 4.6vw, 64px)`. The legacy 16–64px fixed scale remains for subpages.
- Display: weight 700 (900 for the hero), line-height 1.04–1.16, `font-feature-settings: "palt"`, `letter-spacing: -0.01em…-0.02em`, `text-wrap: balance`, `word-break: auto-phrase`.
- Body: UI 16–19px / 1.8, `letter-spacing: .02em`, `text-wrap: pretty` + `word-break: auto-phrase` (short leads use `balance`); long-form `.rich-content` 17–18px / 1.9.
- Mono annotations (`.annotation`, `.section-label`): 12px, uppercase, `letter-spacing: .08em`.
- Layout: `--page-max-width: 1320px`, `--gutter: clamp(20px, 4vw, 56px)`, `.section-shell` = `min(1320px, 100% − 2 × gutter)`, `.grid-12` helper, `--section-gap: clamp(88px, 11vw, 176px)`.
- Paper: faint 8-column blueprint rules (3% ink) fixed behind the page; `.blueprint-dark` for cream rules on ink.
- All buttons, cards, tags, inputs and panels are sharp-cornered (`0px`).

## Component rules

- `.btn-primary`: yellow, 1px ink border. Hover lifts `(-3px, -3px)` onto `--shadow-hard`; active presses flat. On dark grounds the hard shadow is cream.
- `.btn-ghost`: outline; ink fill wipes up from the bottom on hover, text turns cream. `.btn-nav`: ink fill; yellow wipes up, text turns ink. Header only.
- Arrows (`.hover-arrow` inside `.group`) exit right and re-enter from the left. `.hairline-link` / `.link-draw` underline redraws from the left.
- `.badge`: 32px min height, `6px 12px` padding. `badge-live` carries a pulsing teal square.
- `.marker`: yellow highlighter block behind a phrase that swipes in once visible. Treatment: full glyph height, centred on the glyph box (not the line box) so line-height never crops it — 1.12em tall, ~.08em above/below the ink, .06em bleed each side. On dark grounds the marked text turns ink, so the block must always contain the whole glyph.
- `.fact-list`: mono spec rows (`dl > div > dt + dd`) for the left column under a section header rule; pair with an `ArrowLink`. An empty PageHero slot lets the lead take the left columns instead.
- `.panel-surface` / `.glass-panel`: white fill and 1px ink outline only (legacy names, never glassmorphic).
- Shared components: `ui/RevealLines`, `ui/PageHero`, `ui/Marquee`, `ui/ArrowLink`, `cards/BuildFeature`, `sections/HeroIllustration`.

## Imagery

- Draw browser windows, documents, charts and workflow nodes in 1.5px ink strokes on an 8px grid, with registration marks, dimension lines and tiny mono labels (`BRIEF`, `SYSTEM`, `v1.0`).
- Fills: cream, white, yellow and teal only. No gradients, soft shadows, 3D or photography beyond CMS cover images (always in a 1px frame).

## Motion

One vocabulary: **draw a line / unmask a line of type / a part slides into its slot.**

- Easing `--ease-out` `cubic-bezier(.16,1,.3,1)`, `--ease-in-out` `cubic-bezier(.65,0,.35,1)`, `--ease-snap` (parts landing). Durations `--dur-1` 180ms, `--dur-2` 480ms, `--dur-3` 900ms, `--dur-4` 1400ms; stagger 80ms (lines 90ms).
- Attributes: `data-reveal` (rise), `="lines"`, `="clip"`, `="rule"`, `data-stagger`, `data-parallax`, `data-magnetic`, `data-cursor="LABEL"`, `data-count`, `data-clock`, `.marker`, `.marquee`.
- Custom cursor on fine pointers only: a trailing 8px ink square, a ring over links, a 72px yellow label over `[data-cursor]`. The native cursor always stays.
- Intro curtain on the first page of a session only, ≤ 1.2s. ClientRouter page transitions: old page fades up 220ms, the new page unmasks.
- Only `transform`, `opacity` and `clip-path` animate. Offscreen loops pause.
- Initial hidden states are gated behind `html.js`; without JS, or under `prefers-reduced-motion`, the page is complete and static.
