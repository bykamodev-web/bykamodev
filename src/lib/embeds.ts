// microCMS のリッチエディタは iframe をサニタイズで除去するため、
// 本文にはプレーンな YouTube URL のみを置き、描画時にここで埋め込みへ変換する。
// 段落（<p>）の中身が YouTube URL だけのときに iframe へ差し替える。

interface YouTubeEmbed {
  id: string
  vertical: boolean
}

const SHORTS_PATTERN = /youtube\.com\/shorts\/([\w-]{11})/
const HORIZONTAL_PATTERNS = [
  /youtu\.be\/([\w-]{11})/,
  /youtube\.com\/watch\?v=([\w-]{11})/,
  /youtube\.com\/embed\/([\w-]{11})/,
]

function parseYouTube(text: string): YouTubeEmbed | null {
  const shorts = text.match(SHORTS_PATTERN)
  if (shorts) {
    return { id: shorts[1], vertical: true }
  }
  for (const pattern of HORIZONTAL_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      return { id: match[1], vertical: false }
    }
  }
  return null
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim()
}

function renderEmbed({ id, vertical }: YouTubeEmbed): string {
  const orientation = vertical ? ' yt-embed--vertical' : ''
  const src = `https://www.youtube-nocookie.com/embed/${id}`
  return (
    `<div class="yt-embed${orientation}">` +
    `<iframe src="${src}" title="YouTube video player" loading="lazy" ` +
    `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ` +
    `referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>` +
    `</div>`
  )
}

/**
 * 本文 HTML 内で「中身が YouTube URL だけの段落」を埋め込み iframe に変換する。
 * URL がリンク化されている場合（<p><a>...</a></p>）も拾う。元の HTML は変更しない。
 */
export function embedYouTube(html: string): string {
  if (!html) {
    return html
  }
  return html.replace(/<p>([\s\S]*?)<\/p>/g, (block, inner) => {
    const text = stripTags(inner)
    if (!/^https?:\/\/\S+$/.test(text)) {
      return block
    }
    const embed = parseYouTube(text)
    return embed ? renderEmbed(embed) : block
  })
}
