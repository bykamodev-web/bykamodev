import { createClient } from 'microcms-js-sdk'
import type {
  Build,
  Note,
  Topic,
  SiteSettings,
  MicroCMSListResponse,
} from '@/types'

const serviceDomain = import.meta.env.MICROCMS_SERVICE_DOMAIN
const apiKey = import.meta.env.MICROCMS_API_KEY

const isConfigured = serviceDomain && apiKey && serviceDomain !== 'your-service-domain'

const client = isConfigured
  ? createClient({ serviceDomain, apiKey })
  : null

// --- Site Settings (object) ---

const defaultSiteSettings: SiteSettings = {
  siteTitle: 'bykamo.dev',
  siteDescription: 'AIとコードで、情報・運用・体験を組み直す。',
  siteUrl: 'https://bykamo.dev',
  contactEmail: '',
}

export async function getSiteSettings(): Promise<SiteSettings> {
  if (!client) {
    console.error('microCMS not configured, using default site settings')
    return defaultSiteSettings
  }
  try {
    return await client.get<SiteSettings>({ endpoint: 'sitesettings' })
  } catch (error) {
    console.error('Failed to fetch site settings:', error)
    return defaultSiteSettings
  }
}

// --- Builds ---

interface GetBuildsOptions {
  featured?: boolean
  limit?: number
  offset?: number
  topicId?: string
}

const emptyListResponse = <T>(): MicroCMSListResponse<T> => ({
  contents: [],
  totalCount: 0,
  offset: 0,
  limit: 0,
})

export async function getBuilds(
  options: GetBuildsOptions = {}
): Promise<MicroCMSListResponse<Build>> {
  if (!client) {
    console.error('microCMS not configured, returning empty builds')
    return emptyListResponse<Build>()
  }

  const { featured, limit = 100, offset = 0, topicId } = options
  const filters: string[] = ['publishedAt[exists]']

  if (featured) {
    filters.push('featured[equals]true')
  }
  if (topicId) {
    filters.push(`topics[contains]${topicId}`)
  }

  try {
    return await client.get({
      endpoint: 'builds',
      queries: {
        limit,
        offset,
        filters: filters.join('[and]'),
        orders: '-publishedAt',
      },
    })
  } catch (error) {
    console.error('Failed to fetch builds:', error)
    return emptyListResponse<Build>()
  }
}

export async function getBuildBySlug(slug: string): Promise<Build | null> {
  if (!client) {
    console.error('microCMS not configured')
    return null
  }
  try {
    const response = await client.get<MicroCMSListResponse<Build>>({
      endpoint: 'builds',
      queries: {
        filters: `slug[equals]${slug}[and]publishedAt[exists]`,
        limit: 1,
      },
    })
    return response.contents[0] || null
  } catch (error) {
    console.error('Failed to fetch build by slug:', error)
    return null
  }
}

export async function getAllBuildSlugs(): Promise<{ slug: string }[]> {
  if (!client) {
    return []
  }
  try {
    const response = await client.get<MicroCMSListResponse<Build>>({
      endpoint: 'builds',
      queries: {
        fields: 'slug',
        filters: 'publishedAt[exists]',
        limit: 100,
      },
    })
    return response.contents.map((b) => ({ slug: b.slug }))
  } catch (error) {
    console.error('Failed to fetch build slugs:', error)
    return []
  }
}

// --- Notes ---

interface GetNotesOptions {
  featured?: boolean
  limit?: number
  offset?: number
  topicId?: string
}

export async function getNotes(
  options: GetNotesOptions = {}
): Promise<MicroCMSListResponse<Note>> {
  if (!client) {
    console.error('microCMS not configured, returning empty notes')
    return emptyListResponse<Note>()
  }

  const { featured, limit = 100, offset = 0, topicId } = options
  const filters: string[] = ['publishedAt[exists]']

  if (featured) {
    filters.push('featured[equals]true')
  }
  if (topicId) {
    filters.push(`topics[contains]${topicId}`)
  }

  try {
    return await client.get({
      endpoint: 'notes',
      queries: {
        limit,
        offset,
        filters: filters.join('[and]'),
        orders: '-publishedAt',
      },
    })
  } catch (error) {
    console.error('Failed to fetch notes:', error)
    return emptyListResponse<Note>()
  }
}

export async function getNoteBySlug(slug: string): Promise<Note | null> {
  if (!client) {
    console.error('microCMS not configured')
    return null
  }
  try {
    const response = await client.get<MicroCMSListResponse<Note>>({
      endpoint: 'notes',
      queries: {
        filters: `slug[equals]${slug}[and]publishedAt[exists]`,
        limit: 1,
      },
    })
    return response.contents[0] || null
  } catch (error) {
    console.error('Failed to fetch note by slug:', error)
    return null
  }
}

export async function getAllNoteSlugs(): Promise<{ slug: string }[]> {
  if (!client) {
    return []
  }
  try {
    const response = await client.get<MicroCMSListResponse<Note>>({
      endpoint: 'notes',
      queries: {
        fields: 'slug',
        filters: 'publishedAt[exists]',
        limit: 100,
      },
    })
    return response.contents.map((n) => ({ slug: n.slug }))
  } catch (error) {
    console.error('Failed to fetch note slugs:', error)
    return []
  }
}

// --- Topics ---

export async function getTopics(): Promise<MicroCMSListResponse<Topic>> {
  if (!client) {
    console.error('microCMS not configured, returning empty topics')
    return emptyListResponse<Topic>()
  }
  try {
    return await client.get({
      endpoint: 'topics',
      queries: {
        limit: 100,
        orders: 'order',
      },
    })
  } catch (error) {
    console.error('Failed to fetch topics:', error)
    return emptyListResponse<Topic>()
  }
}

export async function getTopicBySlug(slug: string): Promise<Topic | null> {
  if (!client) {
    console.error('microCMS not configured')
    return null
  }
  try {
    const response = await client.get<MicroCMSListResponse<Topic>>({
      endpoint: 'topics',
      queries: {
        filters: `slug[equals]${slug}`,
        limit: 1,
      },
    })
    return response.contents[0] || null
  } catch (error) {
    console.error('Failed to fetch topic by slug:', error)
    return null
  }
}

export async function getAllTopicSlugs(): Promise<{ slug: string }[]> {
  if (!client) {
    return []
  }
  try {
    const response = await client.get<MicroCMSListResponse<Topic>>({
      endpoint: 'topics',
      queries: {
        fields: 'slug',
        limit: 100,
      },
    })
    return response.contents.map((t) => ({ slug: t.slug }))
  } catch (error) {
    console.error('Failed to fetch topic slugs:', error)
    return []
  }
}

// --- Image Optimization (imgix) ---

interface ImageOptions {
  width?: number
  quality?: number
  format?: 'webp' | 'jpg' | 'png'
  aspectRatio?: string
  fit?: 'crop' | 'clip' | 'fill' | 'scale'
}

export function getOptimizedImageUrl(
  url: string,
  options: ImageOptions = {}
): string {
  const { width = 800, quality = 80, format = 'webp', aspectRatio, fit } = options
  const separator = url.includes('?') ? '&' : '?'
  let params = `w=${width}&q=${quality}&fm=${format}`
  if (aspectRatio) {
    params += `&ar=${aspectRatio}&fit=${fit || 'crop'}`
  }
  return `${url}${separator}${params}`
}
