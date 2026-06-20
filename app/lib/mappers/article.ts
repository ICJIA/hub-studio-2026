import type { Article, ArticleWrite, Author, ImageRef, RelationRef } from '~/types/content'
import { mediaFromStrapi, mediaIdForWrite, type StrapiMedia } from '~/lib/strapi-rest'

// Content-Manager entity: scalars + inline media + JSON. Relations appear as { count: N }
// ONLY and are NOT read here — they are hydrated separately and passed via `relations`.
export interface StrapiArticle {
  documentId: string; title: string; slug: string; date: string | null; external?: boolean
  type?: string | null; hideFromBanner?: boolean
  categories?: string[]; tags?: string[]; authors?: Author[]; images?: ImageRef[]
  abstract?: string | null; markdown?: string
  splash?: StrapiMedia | null; thumbnail?: StrapiMedia | null
  mainfiletype?: string | null; mainfile?: StrapiMedia | null; extrafile?: StrapiMedia | null
  doi?: string | null; citation?: string | null; funding?: string | null
  publishedAt?: string | null
}

/** Relation arrays hydrated from the Content-Manager relations endpoint. */
export interface ArticleRelations { apps?: RelationRef[]; datasets?: RelationRef[] }

export function articleFromStrapi(raw: StrapiArticle, relations: ArticleRelations = {}): Article {
  return {
    documentId: raw.documentId,
    title: raw.title,
    slug: raw.slug,
    date: raw.date ?? null,
    external: raw.external ?? false,
    type: raw.type ?? null,
    hideFromBanner: raw.hideFromBanner ?? false,
    categories: raw.categories ?? [],
    tags: raw.tags ?? [],
    authors: raw.authors ?? [],
    abstract: raw.abstract ?? null,
    markdown: raw.markdown ?? '',
    splash: mediaFromStrapi(raw.splash),
    thumbnail: mediaFromStrapi(raw.thumbnail),
    images: raw.images ?? [],
    mainfiletype: raw.mainfiletype ?? null,
    mainfile: mediaFromStrapi(raw.mainfile),
    extrafile: mediaFromStrapi(raw.extrafile),
    doi: raw.doi ?? null,
    citation: raw.citation ?? null,
    funding: raw.funding ?? null,
    apps: relations.apps ?? [],
    datasets: relations.datasets ?? [],
    publishedAt: raw.publishedAt ?? null,
  }
}

// FLAT write body (Content-Manager). Relation fields (apps/datasets) are intentionally
// omitted — relation WRITE is deferred to a later plan.
export function articleToWrite(m: Article): ArticleWrite {
  return {
    title: m.title,
    slug: m.slug,
    date: m.date,
    external: m.external,
    type: m.type,
    hideFromBanner: m.hideFromBanner,
    categories: m.categories,
    tags: m.tags,
    authors: m.authors,
    abstract: m.abstract,
    markdown: m.markdown,
    splash: mediaIdForWrite(m.splash),
    thumbnail: mediaIdForWrite(m.thumbnail),
    images: m.images,
    mainfiletype: m.mainfiletype,
    mainfile: mediaIdForWrite(m.mainfile),
    extrafile: mediaIdForWrite(m.extrafile),
    doi: m.doi,
    citation: m.citation,
    funding: m.funding,
  }
}
