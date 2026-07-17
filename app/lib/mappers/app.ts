import type { App, AppWrite, Contributor, RelationRef } from '~/types/content'
import { mediaFromStrapi, mediaIdForWrite, type StrapiMedia } from '~/lib/strapi-rest'

// Content-Manager entity: scalars + inline media + JSON. Relations are { count: N } only
// and are NOT read here — they are hydrated separately and passed via `relations`.
export interface StrapiApp {
  documentId: string; title: string; slug: string; date?: string | null; external?: boolean
  categories?: string[]; tags?: string[]; contributors?: Contributor[]
  image?: StrapiMedia | null; description?: string | null; url?: string | null
  citation?: string | null; funding?: string | null
  publishedAt?: string | null
  updatedAt?: string | null
}

/** Relation arrays hydrated from the Content-Manager relations endpoint. */
export interface AppRelations { datasets?: RelationRef[]; articles?: RelationRef[] }

export function appFromStrapi(raw: StrapiApp, relations: AppRelations = {}): App {
  return {
    documentId: raw.documentId,
    title: raw.title,
    slug: raw.slug,
    date: raw.date ?? null,
    external: raw.external ?? false,
    categories: raw.categories ?? [],
    tags: raw.tags ?? [],
    contributors: raw.contributors ?? [],
    image: mediaFromStrapi(raw.image),
    description: raw.description ?? null,
    url: raw.url ?? null,
    citation: raw.citation ?? null,
    funding: raw.funding ?? null,
    datasets: relations.datasets ?? [],
    articles: relations.articles ?? [],
    publishedAt: raw.publishedAt ?? null,
    updatedAt: raw.updatedAt ?? null,
  }
}

// FLAT write body (Content-Manager). Relation fields (datasets/articles) are intentionally
// omitted — relation WRITE is deferred to a later plan.
export function appToWrite(m: App): AppWrite {
  return {
    title: m.title,
    slug: m.slug,
    date: m.date,
    external: m.external,
    categories: m.categories,
    tags: m.tags,
    contributors: m.contributors,
    image: mediaIdForWrite(m.image),
    description: m.description,
    url: m.url,
    citation: m.citation,
    funding: m.funding,
  }
}
