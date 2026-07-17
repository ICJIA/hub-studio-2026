// app/lib/repository.ts
// Generic Content-Manager API repository, addressed by content-type `uid`.
// base = /content-manager/collection-types/{uid}. list → {results,pagination};
// findOne/create/update → {data}; create/update bodies are FLAT (NOT wrapped in {data}).
// findOne additionally hydrates each `relationFields` entry from the relations endpoint.
// Deferred (later plans): relation-WRITE (connect/disconnect). The publish action is added in Plan 6.
import type { $Fetch } from 'ofetch'
import type { ContentStatus, RelationRef } from '~/types/content'
import { assertNoBase64 } from '~/lib/base64-guard'
import { isDemoMode } from '~/lib/demo'
import {
  unwrapList, unwrapOne, relationsFromList, flattenFilters,
  type StrapiListResponse, type StrapiSingleResponse, type StrapiRelationsResponse,
} from '~/lib/strapi-rest'

export interface ListOptions {
  status?: ContentStatus
  page?: number
  pageSize?: number
  sort?: string
  /**
   * Filter by the article `type` enum (e.g. 'researchReport'). Applied across ALL items, then
   * paginated — selecting a type re-pages from 1. Undefined → all types (the "All types" option).
   * Maps to a Strapi `filters[type][$eq]` on the real repo and an in-memory equality on the demo repo.
   */
  type?: string
  /** Content-Manager filters, e.g. { authorEmail: { $eq: 'a@x.gov' } }. Backward-compatible: existing callers omit it. */
  filters?: Record<string, unknown>
  /** Case-insensitive title search. Maps to Strapi `filters[title][$containsi]` on the real
   *  repo and an in-memory title-contains on the demo repo. Empty/whitespace ⇒ no filter. */
  search?: string
}
export interface FindOptions { status?: ContentStatus }
export interface WriteOptions { status?: ContentStatus }

/** Relation arrays keyed by field name, as hydrated on findOne. */
export type Relations = Record<string, RelationRef[]>

export interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export interface Repository<TDomain> {
  list(opts?: ListOptions): Promise<TDomain[]>
  listPage(opts?: ListOptions): Promise<PagedResult<TDomain>>
  findOne(documentId: string, opts?: FindOptions): Promise<TDomain>
  create(model: TDomain, opts?: WriteOptions): Promise<TDomain>
  update(documentId: string, model: TDomain, opts?: WriteOptions): Promise<TDomain>
  remove(documentId: string): Promise<void>
  /** Publish a draft via the Content-Manager publish action; returns the now-published entity. */
  publish(documentId: string): Promise<TDomain>
  /** Unpublish an entry via the Content-Manager unpublish action; returns the now-draft entity. */
  unpublish(documentId: string): Promise<TDomain>
}

export interface RepositoryConfig<TRaw, TDomain, TWrite> {
  api: $Fetch
  /** Content-type uid, e.g. 'api::article.article'. */
  uid: string
  /** Relation field names to hydrate on findOne (e.g. ['apps','datasets']). */
  relationFields: string[]
  fromStrapi: (raw: TRaw, relations?: Relations) => TDomain
  toWrite: (model: TDomain) => TWrite
}

/**
 * HARD write-block for the public demo build (belt-and-suspenders). Throws BEFORE any $api call,
 * so even a code path that bypasses the in-memory demo repo can never write to / delete from
 * Strapi. Reads are unaffected. No-op when demoMode is false (normal builds behave exactly as before).
 */
export function assertWritesAllowed(): void {
  if (isDemoMode()) throw new Error('Demo mode: writes are disabled')
}

/**
 * Merge the optional `type` and `search` filters into the caller's `filters` object, logically
 * (still nested at this stage — `{ type: { $eq: ... }, title: { $containsi: ... } }`). The
 * list()/listPage() call sites below flatten this through `flattenFilters()` into the actual
 * wire params (`filters[type][$eq]=...&filters[title][$containsi]=...`) right before the
 * request — never sent as a nested object (see flattenFilters's doc comment in strapi-rest.ts
 * for why that matters). Undefined `type` leaves the caller's `filters` untouched (so the
 * "All types" case sends no type filter at all); empty/whitespace `search` likewise sends no
 * title filter at all.
 */
function buildFilters(opts: ListOptions): Record<string, unknown> | undefined {
  let merged = opts.type ? { ...opts.filters, type: { $eq: opts.type } } : opts.filters
  const term = opts.search?.trim()
  if (term) merged = { ...merged, title: { $containsi: term } }
  return merged
}

export function createRepository<TRaw, TDomain, TWrite>(
  cfg: RepositoryConfig<TRaw, TDomain, TWrite>,
): Repository<TDomain> {
  const base = `/content-manager/collection-types/${cfg.uid}`

  return {
    async list(opts = {}) {
      const res = await cfg.api<StrapiListResponse<TRaw>>(base, {
        query: {
          status: opts.status,
          page: opts.page,
          pageSize: opts.pageSize,
          sort: opts.sort,
          // Flat bracket-key params (filters[title][$containsi]=x), NOT a nested `filters`
          // object — see strapi-rest.ts's flattenFilters doc comment for why.
          ...flattenFilters(buildFilters(opts) ?? {}),
        },
      })
      return unwrapList(res).map((raw) => cfg.fromStrapi(raw))
    },

    async listPage(opts = {}) {
      const res = await cfg.api<StrapiListResponse<TRaw>>(base, {
        query: {
          status: opts.status,
          page: opts.page,
          pageSize: opts.pageSize,
          sort: opts.sort,
          // Flat bracket-key params (filters[title][$containsi]=x), NOT a nested `filters`
          // object — see strapi-rest.ts's flattenFilters doc comment for why.
          ...flattenFilters(buildFilters(opts) ?? {}),
        },
      })
      const items = res.results.map((raw) => cfg.fromStrapi(raw))
      const p = res.pagination
      return { items, total: p.total, page: p.page, pageSize: p.pageSize, pageCount: p.pageCount }
    },

    async findOne(documentId, opts = {}) {
      const res = await cfg.api<StrapiSingleResponse<TRaw>>(`${base}/${documentId}`, {
        query: { status: opts.status },
      })
      const entity = unwrapOne(res)
      const relations: Relations = {}
      for (const field of cfg.relationFields) {
        const relRes = await cfg.api<StrapiRelationsResponse>(
          `/content-manager/relations/${cfg.uid}/${documentId}/${field}`,
        )
        relations[field] = relationsFromList(relRes)
      }
      return cfg.fromStrapi(entity, relations)
    },

    async create(model, opts = {}) {
      assertWritesAllowed() // demo build: no Strapi writes (throws before any $api call)
      const body = cfg.toWrite(model) as Record<string, unknown>
      // Audit I-5: HARD zero-base64 guarantee at the write boundary — a data:/base64 payload is
      // rejected here (throws), not only by the form validators, so a direct repo caller cannot
      // bypass the form layer and persist an inline base64 image.
      assertNoBase64(body, `${cfg.uid} create payload`)
      const res = await cfg.api<StrapiSingleResponse<TRaw>>(base, {
        method: 'POST',
        query: { status: opts.status },
        body,
      })
      return cfg.fromStrapi(unwrapOne(res))
    },

    async update(documentId, model, opts = {}) {
      assertWritesAllowed() // demo build: no Strapi writes (throws before any $api call)
      const body = cfg.toWrite(model) as Record<string, unknown>
      // Audit I-5: same HARD zero-base64 write-time assertion on update.
      assertNoBase64(body, `${cfg.uid} update payload`)
      const res = await cfg.api<StrapiSingleResponse<TRaw>>(`${base}/${documentId}`, {
        method: 'PUT',
        query: { status: opts.status },
        body,
      })
      return cfg.fromStrapi(unwrapOne(res))
    },

    async remove(documentId) {
      assertWritesAllowed() // demo build: no Strapi writes (throws before any $api call)
      await cfg.api(`${base}/${documentId}`, { method: 'DELETE' })
    },

    async publish(documentId) {
      assertWritesAllowed() // demo build: no Strapi writes (throws before any $api call)
      // Content-Manager publish action (LOCKED Plan-6 decision): POST .../actions/publish.
      // Same admin-API family the data layer validated; sets publishedAt and returns the entry
      // ({data} envelope, like update). Strapi ALSO enforces the publisher role server-side
      // (an author's JWT → 403) — the Studio's canPublish UI gate is defense-in-depth.
      const res = await cfg.api<StrapiSingleResponse<TRaw>>(`${base}/${documentId}/actions/publish`, {
        method: 'POST',
      })
      return cfg.fromStrapi(unwrapOne(res))
    },

    async unpublish(documentId) {
      assertWritesAllowed() // demo build: no Strapi writes (throws before any $api call)
      // Content-Manager unpublish action (mirror of publish): POST .../actions/unpublish. Clears
      // publishedAt and returns the entry ({data} envelope, like update). Strapi ALSO enforces the
      // publisher role server-side (an author's JWT → 403); the canPublish UI gate is defense-in-depth.
      const res = await cfg.api<StrapiSingleResponse<TRaw>>(`${base}/${documentId}/actions/unpublish`, {
        method: 'POST',
      })
      return cfg.fromStrapi(unwrapOne(res))
    },
  }
}
