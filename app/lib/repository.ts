// app/lib/repository.ts
// Generic Content-Manager API repository, addressed by content-type `uid`.
// base = /content-manager/collection-types/{uid}. list → {results,pagination};
// findOne/create/update → {data}; create/update bodies are FLAT (NOT wrapped in {data}).
// findOne additionally hydrates each `relationFields` entry from the relations endpoint.
// Deferred (later plans): relation-WRITE (connect/disconnect). The publish action is added in Plan 6.
import type { $Fetch } from 'ofetch'
import type { ContentStatus, RelationRef } from '~/types/content'
import {
  unwrapList, unwrapOne, relationsFromList,
  type StrapiListResponse, type StrapiSingleResponse, type StrapiRelationsResponse,
} from '~/lib/strapi-rest'

export interface ListOptions { status?: ContentStatus; page?: number; pageSize?: number; sort?: string }
export interface FindOptions { status?: ContentStatus }
export interface WriteOptions { status?: ContentStatus }

/** Relation arrays keyed by field name, as hydrated on findOne. */
export type Relations = Record<string, RelationRef[]>

export interface Repository<TDomain> {
  list(opts?: ListOptions): Promise<TDomain[]>
  findOne(documentId: string, opts?: FindOptions): Promise<TDomain>
  create(model: TDomain, opts?: WriteOptions): Promise<TDomain>
  update(documentId: string, model: TDomain, opts?: WriteOptions): Promise<TDomain>
  remove(documentId: string): Promise<void>
  /** Publish a draft via the Content-Manager publish action; returns the now-published entity. */
  publish(documentId: string): Promise<TDomain>
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
        },
      })
      return unwrapList(res).map((raw) => cfg.fromStrapi(raw))
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
      const res = await cfg.api<StrapiSingleResponse<TRaw>>(base, {
        method: 'POST',
        query: { status: opts.status },
        body: cfg.toWrite(model) as Record<string, unknown>,
      })
      return cfg.fromStrapi(unwrapOne(res))
    },

    async update(documentId, model, opts = {}) {
      const res = await cfg.api<StrapiSingleResponse<TRaw>>(`${base}/${documentId}`, {
        method: 'PUT',
        query: { status: opts.status },
        body: cfg.toWrite(model) as Record<string, unknown>,
      })
      return cfg.fromStrapi(unwrapOne(res))
    },

    async remove(documentId) {
      await cfg.api(`${base}/${documentId}`, { method: 'DELETE' })
    },

    async publish(documentId) {
      // Content-Manager publish action (LOCKED Plan-6 decision): POST .../actions/publish.
      // Same admin-API family the data layer validated; sets publishedAt and returns the entry
      // ({data} envelope, like update). Strapi ALSO enforces the publisher role server-side
      // (an author's JWT → 403) — the Studio's canPublish UI gate is defense-in-depth.
      const res = await cfg.api<StrapiSingleResponse<TRaw>>(`${base}/${documentId}/actions/publish`, {
        method: 'POST',
      })
      return cfg.fromStrapi(unwrapOne(res))
    },
  }
}
