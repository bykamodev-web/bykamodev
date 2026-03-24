import type { Build, Note, Topic, BreadcrumbItem } from '@/types'

const SITE_URL = 'https://bykamo.dev'
const SITE_NAME = 'bykamo.dev'
const AUTHOR_NAME = 'KAMO'

export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    author: {
      '@type': 'Person',
      name: AUTHOR_NAME,
    },
  }
}

export function buildProfilePageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: AUTHOR_NAME,
      url: SITE_URL,
      description: 'AIとコードで、情報・運用・体験を組み直す。',
      jobTitle: 'Software Developer',
      knowsAbout: ['AI', 'Automation', 'Web Development', 'DeFi'],
      sameAs: [
        'https://x.com/bykamodev',
        'https://github.com/bykamodev-web',
      ],
    },
  }
}

export function buildArticleSchema(options: {
  title: string
  description: string
  url: string
  publishedAt?: string
  updatedAt?: string
  image?: string
  isTechArticle?: boolean
}) {
  return {
    '@context': 'https://schema.org',
    '@type': options.isTechArticle ? 'TechArticle' : 'Article',
    headline: options.title,
    description: options.description,
    url: options.url,
    author: {
      '@type': 'Person',
      name: AUTHOR_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Person',
      name: AUTHOR_NAME,
    },
    ...(options.publishedAt ? { datePublished: options.publishedAt } : {}),
    ...(options.updatedAt ? { dateModified: options.updatedAt } : {}),
    ...(options.image ? { image: options.image } : {}),
  }
}

export function buildCollectionPageSchema(options: {
  name: string
  description: string
  url: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: options.name,
    description: options.description,
    url: options.url,
  }
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items
      .filter((item) => item.href)
      .map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: item.href?.startsWith('http')
          ? item.href
          : `${SITE_URL}${item.href}`,
      })),
  }
}

// Build page schema helper
export function buildBuildPageSchemas(build: Build) {
  const url = `${SITE_URL}/builds/${build.slug}`
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Builds', href: '/builds' },
    { label: build.title, href: `/builds/${build.slug}` },
  ]

  return [
    buildArticleSchema({
      title: build.title,
      description: build.summary,
      url,
      publishedAt: build.publishedAt,
      updatedAt: build.updatedAt,
      image: build.coverImage?.url,
      isTechArticle: true,
    }),
    buildBreadcrumbSchema(breadcrumbs),
  ]
}

// Note page schema helper
export function buildNotePageSchemas(note: Note) {
  const url = `${SITE_URL}/notes/${note.slug}`
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Notes', href: '/notes' },
    { label: note.title, href: `/notes/${note.slug}` },
  ]

  return [
    buildArticleSchema({
      title: note.title,
      description: note.excerpt,
      url,
      publishedAt: note.publishedAt,
      updatedAt: note.updatedAt,
      image: note.coverImage?.url,
    }),
    buildBreadcrumbSchema(breadcrumbs),
  ]
}

// Topic page schema helper
export function buildTopicPageSchemas(topic: Topic) {
  const url = `${SITE_URL}/topics/${topic.slug}`
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Topics', href: '/topics' },
    { label: topic.title, href: `/topics/${topic.slug}` },
  ]

  return [
    buildCollectionPageSchema({
      name: topic.title,
      description: topic.intro,
      url,
    }),
    buildBreadcrumbSchema(breadcrumbs),
  ]
}
