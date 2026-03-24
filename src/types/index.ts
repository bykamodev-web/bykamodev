import type { MicroCMSImage, MicroCMSDate } from 'microcms-js-sdk'

// --- Custom Fields ---

export interface SeoMeta {
  fieldId: 'seoMeta'
  metaTitle?: string
  metaDescription?: string
  ogImage?: MicroCMSImage
  noIndex?: boolean
  canonicalPath?: string
}

export interface StackItem {
  fieldId: 'stackItem'
  name: string
  role?: string
  url?: string
}

export interface LinkItem {
  fieldId: 'linkItem'
  label?: string
  url: string
  note?: string
}

// --- API Models ---

// topics (list)
export interface Topic extends MicroCMSDate {
  id: string
  title: string
  slug: string
  intro: string
  description?: string
  order?: number
  featured?: boolean
  seoMeta?: SeoMeta
}

// builds (list)
export type StatusLabel = 'planning' | 'building' | 'live' | 'archived'

export interface Build extends MicroCMSDate {
  id: string
  title: string
  slug: string
  summary: string
  coverImage: MicroCMSImage
  statusLabel: StatusLabel[]
  problem: string
  solution: string
  outcome?: string
  body?: string
  stack?: StackItem[]
  links?: LinkItem[]
  topics: Topic[]
  relatedNotes?: Note[]
  featured?: boolean
  seoMeta?: SeoMeta
  publishedAt?: string
}

// notes (list)
export type NoteKind = 'log' | 'howto' | 'case-study' | 'thinking'

export interface Note extends MicroCMSDate {
  id: string
  title: string
  slug: string
  excerpt: string
  coverImage?: MicroCMSImage
  kind?: NoteKind[]
  body: string
  topics?: Topic[]
  relateBuilds?: Build[]  // NOTE: microCMS fieldId is "relateBuilds" (typo in CMS)
  relatedNotes?: Note[]
  featured?: boolean
  seoMeta?: SeoMeta
  publishedAt?: string
}

// sitesettings (object)
export interface SiteSettings {
  siteTitle: string
  siteDescription: string
  siteUrl: string
  defaultOgImage?: MicroCMSImage
  contactEmail: string
  xurl?: string
  githubUrl?: string
  gaMeasurementId?: string
  gscVerificationCode?: string
}

// --- API Response ---

export interface MicroCMSListResponse<T> {
  contents: T[]
  totalCount: number
  offset: number
  limit: number
}

// --- UI Types ---

export interface SEOProps {
  title?: string
  description?: string
  ogImage?: string
  canonical?: string
  noindex?: boolean
}

export interface NavItem {
  label: string
  href: string
}

export interface BreadcrumbItem {
  label: string
  href?: string
}
