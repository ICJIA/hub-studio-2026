// tests/unit/annotations-store-strapi.test.ts
// The Phase-2 AnnotationStore adapter (spec §4b): AnnotationStore contract → Content-Manager
// admin API calls on api::review-annotation.review-annotation, via the same generic repository
// the content types use. Verified against a recording fake $Fetch — list filtering + full
// pagination sweep, create returning the SERVER row (server-assigned id), read-modify-write
// for addComment/setResolved, delete, and the validator firing BEFORE any network call.
import { describe, it, expect } from 'vitest'
import { createStrapiAnnotationStore } from '~/lib/annotations/store-strapi'
import type { StrapiReviewAnnotation } from '~/lib/mappers/annotation'
import type { ReviewAnnotation } from '~/types/annotations'
import type { $Fetch } from 'ofetch'

const BASE = '/content-manager/collection-types/api::review-annotation.review-annotation'

function serverRow(over: Partial<StrapiReviewAnnotation> = {}): StrapiReviewAnnotation {
  return {
    documentId: 'ra-1', contentType: 'article', targetDocumentId: 'art-42',
    exact: 'brown fox', prefix: 'The quick ', suffix: ' jumps', offsetHint: 10,
    color: 'green', resolved: false,
    authorName: 'Jo', authorEmail: 'jo@icjia.gov', authorRole: 'Editor',
    comments: [{ id: 'c1', body: 'Note', authorName: 'Jo', authorEmail: 'jo@icjia.gov', createdAt: '2026-07-05T09:00:00.000Z' }],
    createdAt: '2026-07-05T09:00:00.000Z',
    ...over,
  }
}

function domainAnnotation(over: Partial<ReviewAnnotation> = {}): ReviewAnnotation {
  return {
    id: 'local-uuid', contentType: 'article', documentId: 'art-42',
    anchor: { exact: 'brown fox', prefix: 'The quick ', suffix: ' jumps', offset: 10 },
    color: 'green', resolved: false, createdAt: '2026-07-05T09:00:00.000Z',
    createdBy: { name: 'Jo', email: 'jo@icjia.gov', roleLabel: 'Editor' },
    comments: [{ id: 'c1', body: 'Note', authorName: 'Jo', authorEmail: 'jo@icjia.gov', createdAt: '2026-07-05T09:00:00.000Z' }],
    ...over,
  }
}

interface Call { url: string; method: string; query?: Record<string, unknown>; body?: Record<string, unknown> }

/** Recording fake $Fetch: `respond` decides each response from (url, method, call#). */
function fakeApi(respond: (call: Call, n: number) => unknown) {
  const calls: Call[] = []
  const api = (async (url: string, opts: { method?: string; query?: Record<string, unknown>; body?: Record<string, unknown> } = {}) => {
    const call: Call = { url, method: opts.method ?? 'GET', query: opts.query, body: opts.body }
    calls.push(call)
    return respond(call, calls.length)
  }) as unknown as $Fetch
  return { api, calls }
}

describe('createStrapiAnnotationStore', () => {
  it('list: filters by contentType + targetDocumentId, sorts by createdAt, maps rows', async () => {
    const { api, calls } = fakeApi(() => ({
      results: [serverRow(), serverRow({ documentId: 'ra-2', exact: 'lazy dog' })],
      pagination: { page: 1, pageSize: 100, pageCount: 1, total: 2 },
    }))
    const store = createStrapiAnnotationStore(api)
    const list = await store.list('article', 'art-42')
    expect(calls).toHaveLength(1)
    expect(calls[0]!.url).toBe(BASE)
    // CRITICAL fix (whole-branch review): asserts the FLAT bracket-key wire shape, not a nested
    // `filters` object. store-strapi.ts's list() flows through repo.listPage() → the same
    // createRepository()/flattenFilters() path the title-search fix lands in repository.ts —
    // this Content-Manager admin-API call site (api::review-annotation) is fixed by the same
    // change, not a separate one (verified: annotations.ts's createAnnotationsRepository is a
    // thin createRepository() wrapper with no independent query serialization).
    expect(calls[0]!.query).toMatchObject({
      sort: 'createdAt:asc',
      pageSize: 100,
      'filters[contentType][$eq]': 'article',
      'filters[targetDocumentId][$eq]': 'art-42',
    })
    expect(calls[0]!.query!.filters).toBeUndefined()
    expect(list.map((a) => a.id)).toEqual(['ra-1', 'ra-2'])
    expect(list[1]!.anchor.exact).toBe('lazy dog')
  })

  it('list: sweeps every page (no silent 100-row cap)', async () => {
    const { api, calls } = fakeApi((call) => {
      const page = Number(call.query?.page ?? 1)
      return {
        results: [serverRow({ documentId: `ra-p${page}` })],
        pagination: { page, pageSize: 100, pageCount: 3, total: 3 },
      }
    })
    const store = createStrapiAnnotationStore(api)
    const list = await store.list('article', 'art-42')
    expect(calls.map((c) => c.query?.page)).toEqual([1, 2, 3])
    expect(list.map((a) => a.id)).toEqual(['ra-p1', 'ra-p2', 'ra-p3'])
  })

  it('create: POSTs the flattened write shape and returns the SERVER row (server id wins)', async () => {
    const { api, calls } = fakeApi(() => ({ data: serverRow({ documentId: 'ra-created' }) }))
    const store = createStrapiAnnotationStore(api)
    const created = await store.create(domainAnnotation())
    expect(calls[0]!.method).toBe('POST')
    expect(calls[0]!.url).toBe(BASE)
    expect(calls[0]!.body).toMatchObject({ targetDocumentId: 'art-42', exact: 'brown fox', color: 'green' })
    expect('id' in calls[0]!.body!).toBe(false)
    expect(created.id).toBe('ra-created') // NOT the client-side uuid
  })

  it('create: an invalid annotation throws and NEVER touches the network', async () => {
    const { api, calls } = fakeApi(() => ({ data: serverRow() }))
    const store = createStrapiAnnotationStore(api)
    await expect(store.create(domainAnnotation({ anchor: { exact: ' ', prefix: '', suffix: '', offset: 0 } })))
      .rejects.toThrow(/anchor/)
    expect(calls).toHaveLength(0)
  })

  it('addComment: fetches the fresh row, PUTs with the appended comment, returns the update', async () => {
    const { api, calls } = fakeApi((call) =>
      call.method === 'GET'
        ? { data: serverRow() }
        : { data: serverRow({ comments: call.body!.comments as StrapiReviewAnnotation['comments'] }) })
    const store = createStrapiAnnotationStore(api)
    const reply = { id: 'c2', body: 'Agreed', authorName: 'Sam', authorEmail: 'sam@icjia.gov', createdAt: '2026-07-05T10:00:00.000Z' }
    const updated = await store.addComment('ra-1', reply)
    expect(calls.map((c) => c.method)).toEqual(['GET', 'PUT'])
    expect(calls[0]!.url).toBe(`${BASE}/ra-1`)
    expect(calls[1]!.url).toBe(`${BASE}/ra-1`)
    expect((calls[1]!.body!.comments as unknown[])).toHaveLength(2)
    expect(updated.comments).toHaveLength(2)
  })

  it('setResolved: fetches fresh, PUTs the flag, returns the update', async () => {
    const { api, calls } = fakeApi((call) =>
      call.method === 'GET' ? { data: serverRow() } : { data: serverRow({ resolved: call.body!.resolved as boolean }) })
    const store = createStrapiAnnotationStore(api)
    const updated = await store.setResolved('ra-1', true)
    expect(calls.map((c) => c.method)).toEqual(['GET', 'PUT'])
    expect(calls[1]!.body!.resolved).toBe(true)
    expect(updated.resolved).toBe(true)
  })

  it('remove: DELETEs the row', async () => {
    const { api, calls } = fakeApi(() => ({}))
    const store = createStrapiAnnotationStore(api)
    await store.remove('ra-1')
    expect(calls).toEqual([expect.objectContaining({ url: `${BASE}/ra-1`, method: 'DELETE' })])
  })
})
