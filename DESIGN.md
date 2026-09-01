# bykamo.dev — Syllabus-inspired design system

bykamo.dev is a warm editorial-tech portfolio. The page is cream paper, its structure is near-black violet, and the only raised voice is a buttery-yellow CTA with a hard offset shadow. Treat every product graphic as flat schematic line-art, never a glossy dashboard or photograph.

## Core tokens

| Token | Value | Use |
| --- | --- | --- |
| `--color-ink-violet` | `#0d0129` | Text, all 1px borders, line-art strokes |
| `--color-butter-yellow` | `#fae59b` | Primary in-page CTAs, small illustration fills |
| `--color-deep-teal` | `#19615c` | Full-bleed contrast sections |
| `--color-cream-paper` | `#fffcf7` | Page canvas |
| `--color-pure-white` | `#ffffff` | Inset cards and panels |
| `--shadow-subtle` | `rgb(0, 0, 0) 1px 1px 3px 0px` | Yellow CTA only |

## Type and layout

- Use `--font-roobert` (Roobert → Inter/Noto Sans JP fallback) at weights 400 and 700 only.
- The fixed type scale is 16 / 20 / 24 / 40 / 48 / 56 / 64px. Display is tight; body is `20px / 1.6`.
- The main content container is 1200px wide, with a 120px desktop section rhythm.
- All buttons, cards, tags, inputs, and panels are sharp-cornered (`0px`).

## Component rules

- `.btn-primary`: butter yellow, 1px violet border, hard black offset shadow. It is the conversion action on cream surfaces.
- `.btn-nav`: violet fill, cream text, no shadow. Reserved for the header CTA.
- `.btn-ghost`: transparent with a violet outline.
- `.glass-panel` and `.panel-surface`: white fill and 1px violet outline only; despite their legacy class names, they are not glassmorphic.
- Teal sections use cream copy with restrained yellow labels and dots.

## Imagery and motion

- Draw browser windows, documents, charts, and workflow nodes in 1–1.5px violet strokes.
- Use only cream, white, yellow, and teal fills. No gradients, soft shadows, 3D, or photography.
- Keep motion sparse: entry reveal, a subtle illustration float, and small link/card hover shifts. Respect reduced-motion preferences.
