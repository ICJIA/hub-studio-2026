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

/** Flatten an inline-populated MULTIPLE media array to MediaRef[] (mirrors mediaFromStrapi). */
export function mediaListFromStrapi(list: (StrapiMedia | null | undefined)[] | null | undefined): MediaRef[] {
  if (!list) return []
  return list.map((m) => mediaFromStrapi(m)).filter((m): m is MediaRef => m !== null)
}

/** Reduce a MediaRef[] to the numeric upload ids written to a MULTIPLE media field. Demo/placeholder
 *  refs (id <= 0) are dropped — no bogus media id reaches Strapi (mirrors mediaIdForWrite). */
export function mediaIdsForWrite(refs: MediaRef[] | null | undefined): number[] {
  return (refs ?? []).filter((r) => r && r.id > 0).map((r) => r.id)
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

/**
 * CRITICAL fix (whole-branch review, title-search): the ofetch client in lib/api.ts has no
 * custom query serializer, so a NESTED-OBJECT query value (e.g. `filters: { title: { $containsi:
 * 'x' } }`) is JSON.stringified by ufo's `encodeQueryValue` (node_modules/ufo/dist/index.mjs)
 * before it reaches the wire — `filters=%7B%22title%22...%7D`. Strapi 5's query parser is
 * qs-based (bracket-key nesting, e.g. `a[b][c]=x` → `{a:{b:{c:'x'}}}`) and rejects a STRING
 * filters param (`convertFiltersQueryParams`: "The filters parameter must be an object or an
 * array"). This is shared plumbing — the Content API, the Upload plugin REST (already
 * live-sandbox-validated here: lib/upload.ts's `filters[name][$containsi]`), and the
 * Content-Manager admin API this repo's repositories call are all mounted on the one Koa app
 * with the same global qs bracket-key parsing, so the fix is uniform across all of them.
 *
 * Recursively flattens a Strapi filters object into flat bracket-key query params:
 * `{ title: { $containsi: 'x' } }` → `{ 'filters[title][$containsi]': 'x' }`. Nested objects
 * recurse (`path[key]`); arrays index as `path[i]` (for logical wrappers like `$and`/`$or`);
 * scalars (string/number/boolean) are leaves, written through as-is (never stringified — the
 * whole point is that ofetch/ufo never sees a non-scalar query value to JSON.stringify).
 * null/undefined leaves are dropped (nothing meaningful to send). Pure — no I/O.
 */
export function flattenFilters(
  filters: Record<string, unknown>,
  prefix = 'filters',
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  flattenFilterValue(out, filters, prefix)
  return out
}

function flattenFilterValue(
  out: Record<string, string | number | boolean>,
  value: unknown,
  path: string,
): void {
  if (value === null || value === undefined) return
  if (Array.isArray(value)) {
    value.forEach((item, i) => flattenFilterValue(out, item, `${path}[${i}]`))
  } else if (typeof value === 'object') {
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      flattenFilterValue(out, v, `${path}[${key}]`)
    }
  } else {
    // Runtime-excluded null/undefined/array/object above; only string/number/boolean remain.
    out[path] = value as string | number | boolean
  }
}
