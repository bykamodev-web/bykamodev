# DESIGN.md — bykamo.dev Design System

> Claude Code はこのファイルを参照して、UI生成時にデザインシステムに一貫したコードを出力する。

---

## Overview

bykamo.dev は「紙とインク」をメタファーにしたミニマルなポートフォリオサイト。
温かみのあるベージュ背景に、濃いインク色のテキスト、ブルーのアクセントで構成される。
グラスモーフィズム（backdrop-blur + 半透明白）をパネルに適用し、奥行きを演出。

- **Framework:** Astro 5 + Cloudflare Pages
- **CSS:** Tailwind CSS v4 + CSS Custom Properties (`@theme`)
- **Fonts:** DM Sans / DM Mono / Noto Sans JP (Google Fonts)
- **Language:** Japanese (ja)

---

## Color Tokens

### Ink (Text)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-ink` | `#121417` | 見出し・主要テキスト |
| `--color-ink-secondary` | `#313741` | 本文テキスト |
| `--color-ink-muted` | `#606874` | 補助テキスト |
| `--color-ink-subtle` | `#89919d` | キャプション・メタ情報 |

### Paper (Background)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-paper` | `#f3eee4` | メイン背景 |
| `--color-paper-strong` | `#e8e0d3` | 強調背景 |

### Surface (Panels)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-surface` | `rgba(255, 255, 255, 0.68)` | パネル背景 |
| `--color-surface-strong` | `rgba(255, 255, 255, 0.88)` | 強調パネル |
| `--color-surface-muted` | `rgba(255, 255, 255, 0.42)` | 控えめパネル |

### Border

| Token | Value | Usage |
|-------|-------|-------|
| `--color-border` | `rgba(18, 20, 23, 0.12)` | 標準ボーダー |
| `--color-border-strong` | `rgba(18, 20, 23, 0.2)` | 強調ボーダー |

### Brand

| Token | Value | Usage |
|-------|-------|-------|
| `--color-brand` | `#2d4ed8` | ブランドブルー |
| `--color-brand-hover` | `#203bb0` | ホバー時 |
| `--color-brand-light` | `rgba(45, 78, 216, 0.12)` | 薄いブルー背景 |

### Status

| Token | Value | Usage |
|-------|-------|-------|
| `--color-live` / `--color-live-light` | `#0f8a5d` / `rgba(15, 138, 93, 0.12)` | 公開済み |
| `--color-building` / `--color-building-light` | `#2d4ed8` / `rgba(45, 78, 216, 0.12)` | 開発中 |
| `--color-planning` / `--color-planning-light` | `#b86a11` / `rgba(184, 106, 17, 0.12)` | 企画中 |
| `--color-archived` / `--color-archived-light` | `#6c7280` / `rgba(108, 114, 128, 0.12)` | アーカイブ |

---

## Typography

### Font Families

| Token | Fonts | Usage |
|-------|-------|-------|
| `--font-sans` | "DM Sans", "Noto Sans JP", system-ui, sans-serif | 本文・見出し |
| `--font-mono` | "DM Mono", "Fira Code", ui-monospace, monospace | コード |

### Font Weights

- `400` — 本文
- `600` — セミボールド（タグ等）
- `700` — 見出し・ボタン・ラベル

### Text Styles

| Class | Size | Weight | Letter Spacing | Line Height | Notes |
|-------|------|--------|----------------|-------------|-------|
| `.section-label` | 0.72rem | 700 | 0.18em | — | 大文字、セクション見出し |
| `.page-title` | clamp(1.5rem, 2.8vw, 2.25rem) | 700 | -0.03em | — | ページタイトル |
| `.hero-title` | clamp(1.6rem, 3vw, 2.5rem) | 700 | -0.03em | 1.2 | ヒーロー見出し |
| `.body-text` | 0.9375rem | 400 | — | 1.8 | 本文 |
| `.body-text-lg` | clamp(0.9375rem, 1.2vw, 1.0625rem) | 400 | — | 1.85 | やや大きい本文 |
| `.caption` | 0.75rem | 400 | — | 1.5 | キャプション |

---

## Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--space-section` | 7rem (112px) | セクション間 |
| `--space-section-sm` | 4.5rem (72px) | 小セクション間 |
| `--space-block` | 2.5rem (40px) | ブロック間 |
| `--space-element` | 1.25rem (20px) | 要素間 |
| `--space-tight` | 0.75rem (12px) | 密接な要素間 |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 0.5rem (8px) | 小さいUI要素 |
| `--radius-md` | 0.875rem (14px) | カード・入力 |
| `--radius-lg` | 1.25rem (20px) | パネル |
| `--radius-xl` | 1.75rem (28px) | 大きなパネル |
| `9999px` | pill | ボタン・バッジ・タグ |

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-panel` | `0 20px 70px -38px rgba(17, 23, 38, 0.24)` | パネルの浮遊感 |

---

## Components

### Buttons

**Primary (`.btn-primary`)**
- Background: `var(--color-ink)` → Hover: `#090b0d`
- Color: `#fff`
- Border: `1px solid rgba(18, 20, 23, 0.95)`
- Border-radius: `9999px` (pill)
- Min-height: `3rem`
- Padding: `0.85rem 1.35rem`
- Font: `0.82rem`, weight `700`, letter-spacing `0.06em`, uppercase
- Hover: `translateY(-1px)`
- Transition: `180ms ease`

**Ghost (`.btn-ghost`)**
- Background: `rgba(255, 255, 255, 0.44)` → Hover: `rgba(255, 255, 255, 0.72)`
- Backdrop-filter: `blur(10px)`
- Border: `1px solid var(--color-border)` → Hover: `var(--color-border-strong)`
- その他は Primary と同じ形状

### Badges

- Border-radius: `9999px` (pill)
- Min-height: `1.7rem`
- Font: `0.69rem`, weight `700`, letter-spacing `0.04em`, uppercase
- Variants: `.badge-live`, `.badge-building`, `.badge-planning`, `.badge-archived`
- 各バリアントは対応する Status カラーを使用

### Panels

**`.panel-surface`**
- Background: `var(--color-surface)`
- Border: `1px solid var(--color-border)`
- Border-radius: `var(--radius-xl)`
- Box-shadow: `var(--shadow-panel)`
- Backdrop-filter: `blur(18px)`

### Tech Tags

- Border-radius: `9999px`
- Min-height: `1.9rem`
- Border: `1px solid rgba(18, 20, 23, 0.08)`
- Background: `rgba(255, 255, 255, 0.58)`
- Font: `0.72rem`, weight `600`
- Color: `var(--color-ink-muted)`

### Icon Box

- Size: `2.75rem` x `2.75rem`
- Border-radius: `9999px`
- Border: `1px solid rgba(18, 20, 23, 0.08)`
- Background: `rgba(255, 255, 255, 0.7)`

### Links

**`.hairline-link`**
- Font: `0.82rem`, weight `700`, letter-spacing `0.06em`, uppercase
- Gap: `0.55rem`
- Arrow icon scales on group hover

---

## Rich Content (Article Body)

| Element | Style |
|---------|-------|
| Base | 1rem, line-height 1.9, color `var(--color-ink-secondary)` |
| `h2` | 1.25rem, bold, border-bottom `1px solid rgba(18, 20, 23, 0.08)` |
| `h3` | 1.0625rem, bold |
| `p` | margin-bottom 1.5rem |
| `a` | color `var(--color-brand)`, underline offset 3px |
| `pre` | bg `#0f1114`, color `#e7e7ec`, radius `var(--radius-lg)` |
| `code` | font `var(--font-mono)`, 0.85em |
| `blockquote` | border-left `2px solid var(--color-brand)`, bg `rgba(255, 255, 255, 0.56)` |

---

## Animations & Transitions

### Page Enter

```css
@keyframes pageFade { from { opacity: 0 } to { opacity: 1 } }
/* Duration: 500ms ease-out */
```

### Reveal (Scroll)

- Initial: `opacity: 0; translate3d(0, 24px, 0)`
- Active: `opacity: 1; translate3d(0, 0, 0)`
- Duration: `700ms cubic-bezier(0.22, 1, 0.36, 1)`
- Delay: CSS variable `--delay`

### Float (Hero Orbs)

- `floatPrimary`: 8.5s, translateY 0 → -8px → 0
- `floatSecondary`: 9.5s-10.5s, translateY 0 → 10px → 0

### Parallax

- Range: `-22px` to `22px` based on scroll
- Transform: `translate3d(0, var(--parallax-y, 0px), 0)`

### Interaction

- Buttons/Links: `transition: 180ms ease`
- Hover lift: `translateY(-1px)`

---

## Background

### Page Background

```css
/* html */
radial-gradient(circle at top left, rgba(255, 255, 255, 0.95), transparent 32%),
radial-gradient(circle at top right, rgba(45, 78, 216, 0.08), transparent 26%),
linear-gradient(180deg, #f8f4ec 0%, var(--color-paper) 30%, #f1ece3 100%);

/* body — subtle grid pattern */
linear-gradient(180deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0.08)),
linear-gradient(90deg, rgba(18, 20, 23, 0.015) 1px, transparent 1px),
linear-gradient(rgba(18, 20, 23, 0.015) 1px, transparent 1px);
background-size: auto, 32px 32px, 32px 32px;
```

---

## Layout

### Header

- Fixed, z-index 50, height `4rem`
- Background: `rgba(243, 238, 228, 0.74)` + `backdrop-filter: blur()`
- Mobile: ハンバーガーメニュー、md+ でナビ表示

### Main Content

- `max-width: 72rem` (max-w-6xl), `mx-auto`, `px-6`
- `padding-top: 4rem` (header height offset)

### Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| default | 0px | モバイル |
| `md` | 768px | タブレット・ナビ切替 |
| `lg` | 1024px | レイアウト調整 |
| `xl` | 1280px | グリッド拡張 |

---

## Accessibility

- `prefers-reduced-motion: reduce` で全アニメーション無効化
- `::selection` に brand カラー適用
- `-webkit-font-smoothing: antialiased`
- `text-rendering: optimizeLegibility`

---

## Design Principles

1. **紙とインク** — 温かみのあるベージュ背景 + 濃いインクテキスト
2. **グラスモーフィズム** — 半透明白パネル + backdrop-blur で奥行き
3. **ミニマル** — 装飾を最小限に、コンテンツを主役に
4. **Fluid Typography** — clamp() でモバイルからデスクトップまで滑らかにスケール
5. **Subtle Motion** — 控えめなアニメーションで上質感を演出
6. **Japanese-first** — Noto Sans JP で日本語の可読性を確保
