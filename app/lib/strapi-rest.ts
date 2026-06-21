// Strapi 5 Content-Manager API envelopes + flatten helpers (validated against the live
// sandbox 2026-06-20). List → { results, pagination } (key `results`, NOT `data`);
// single/create/update → { data }. Media is populated inline (with alt + caption).
// Relations are NOT inline items on the entity (the entity carries { count: N } only) —
// items come from the separate /content-manager/relations/{uid}/{documentId}/{field}
// endpoint, shaped { results, pagination }.
import type { MediaRef, RelationRef } from '~/types/content'

export interface StrapiPagination { page: number; pageSize: number; pageCount: number; total: number }

/** Content-Manager list envelope: collection key is `results`, pagination is top-level. */
export interface StrapiListResponse<T> { results: T[]; pagination: StrapiPagination }
/** Content-Manager single/create/update envelope. */
export interface StrapiSingleResponse<T> { data: T }

export function unwrapList<T>(res: StrapiListResponse<T>): T[] { return res.results }
export function unwrapOne<T>(res: StrapiSingleResponse<T>): T { return res.data }

/** Shape of an inline-populated Content-Manager media object (flattened, not v4 `.data.attributes`). */
export interface StrapiMedia {
  id: number
  url: string
  name?: string
  alternativeText?: string | null
  caption?: string | null
  width?: number | null
  height?: number | null
  mime?: string
}

export function mediaFromStrapi(m: StrapiMedia | null | undefined): MediaRef | null {
  if (!m) return null
  return {
    id: m.id,
    url: m.url,
    name: m.name,
    alternativeText: m.alternativeText ?? null,
    caption: m.caption ?? null,
    width: m.width ?? null,
    height: m.height ?? null,
    mime: m.mime,
  }
}

export function mediaIdForWrite(ref: MediaRef | null | undefined): number | null {
  // Only a real Media Library upload (positive id) is written. Demo/placeholder refs (id <= 0)
  // carry a display url but no upload, so they map to null — no bogus media id reaches Strapi.
  return ref && ref.id > 0 ? ref.id : null
}

/**
 * Shape of one item from the Content-Manager relations endpoint. It has `documentId`
 * and `title` but NO `slug`; extra fields (publishedAt/updatedAt/status) are allowed and ignored.
 */
export interface StrapiRelationItem {
  id: number
  documentId: string
  title: string
  [key: string]: unknown
}

/** Response shape of GET /content-manager/relations/{uid}/{documentId}/{field}. */
export interface StrapiRelationsResponse {
  results: StrapiRelationItem[]
  pagination: StrapiPagination
}

/** Map a relations-endpoint response to RelationRef[] (slug omitted — the endpoint does not return it). */
export function relationsFromList(res: StrapiRelationsResponse | null | undefined): RelationRef[] {
  return (res?.results ?? []).map((r) => ({ documentId: r.documentId, title: r.title }))
}

/**
 * Reduce RelationRef[] to documentId[]. Exported for later plans only — relation WRITE
 * (connect/disconnect) is DEFERRED in this plan, so nothing in this plan calls this.
 */
export function relationsToWrite(refs: RelationRef[] | null | undefined): string[] {
  return (refs ?? []).map((r) => r.documentId)
}
