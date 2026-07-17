// tests/unit/repository.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createRepository, type Relations } from '~/lib/repository'
import type { $Fetch } from 'ofetch'

interface Raw { documentId: string; title: string }
interface Dom { documentId: string; title: string; loud: string; rels: Relations }
// fromStrapi now receives (entity, relations); echo the relations so we can assert hydration.
const fromStrapi = (r: Raw, relations: Relations = {}): Dom => ({ ...r, loud: r.title.toUpperCase(), rels: relations })
const toWrite = (d: Dom) => ({ title: d.title })

const UID = 'api::article.article'
const BASE = `/content-manager/collection-types/${UID}`
const makeRepo = (api: $Fetch) =>
  createRepository<Raw, Dom, { title: string }>({ api, uid: UID, relationFields: ['datasets'], fromStrapi, toWrite })

describe('createRepository (Content-Manager API)', () => {
  it('list() GETs the collection ({results}) with status and maps each row (no relations)', async () => {
    const api = vi.fn().mockResolvedValue({ results: [{ documentId: 'a', title: 'x' }], pagination: {} }) as unknown as $Fetch
    const out = await makeRepo(api).list({ status: 'draft' })
    expect(api).toHaveBeenCalledWith(BASE, expect.objectContaining({ query: expect.objectContaining({ status: 'draft' }) }))
    expect(out).toEqual([{ documentId: 'a', title: 'x', loud: 'X', rels: {} }])
  })

  it('findOne() GETs the entity ({data}) then GETs each relation field and merges them', async () => {
    const mockFn = vi.fn()
      .mockResolvedValueOnce({ data: { documentId: 'a', title: 'x' } }) // entity
      .mockResolvedValueOnce({ results: [{ id: 5, documentId: 'd1', title: 'Crime Data' }], pagination: {} }) // datasets relation
    const api = mockFn as unknown as $Fetch
    const out = await makeRepo(api).findOne('a')
    expect(api).toHaveBeenNthCalledWith(1, `${BASE}/a`, expect.anything())
    // The relations GET is called with the URL only (no options); assert the URL.
    expect(api).toHaveBeenNthCalledWith(2, `/content-manager/relations/${UID}/a/datasets`)
    expect(out.loud).toBe('X')
    expect(out.rels).toEqual({ datasets: [{ documentId: 'd1', title: 'Crime Data' }] })
  })

  it('create() POSTs a FLAT body (NOT wrapped in {data}) produced by toWrite', async () => {
    const api = vi.fn().mockResolvedValue({ data: { documentId: 'a', title: 'x' } }) as unknown as $Fetch
    await makeRepo(api).create({ documentId: '', title: 'x', loud: 'X', rels: {} })
    expect(api).toHaveBeenCalledWith(BASE, expect.objectContaining({ method: 'POST', body: { title: 'x' } }))
  })

  it('update() PUTs to /{documentId} with a FLAT body', async () => {
    const api = vi.fn().mockResolvedValue({ data: { documentId: 'a', title: 'y' } }) as unknown as $Fetch
    await makeRepo(api).update('a', { documentId: 'a', title: 'y', loud: 'Y', rels: {} })
    expect(api).toHaveBeenCalledWith(`${BASE}/a`, expect.objectContaining({ method: 'PUT', body: { title: 'y' } }))
  })

  it('remove() DELETEs by documentId', async () => {
    const api = vi.fn().mockResolvedValue(undefined) as unknown as $Fetch
    await makeRepo(api).remove('a')
    expect(api).toHaveBeenCalledWith(`${BASE}/a`, expect.objectContaining({ method: 'DELETE' }))
  })

  // Audit I-5: HARD zero-base64 guard at the repository write boundary (not just the form layer).
  describe('zero-base64 write-time guard (audit I-5)', () => {
    interface DomImg { documentId: string; title: string; image: string }
    // A toWrite that lets a data:/base64 image url through into the payload.
    const toWriteImg = (d: DomImg) => ({ title: d.title, image: d.image })
    const fromImg = (r: { documentId: string; title: string }): DomImg => ({ ...r, image: '' })
    const makeImgRepo = (api: $Fetch) =>
      createRepository<{ documentId: string; title: string }, DomImg, { title: string; image: string }>({
        api, uid: UID, relationFields: [], fromStrapi: fromImg, toWrite: toWriteImg,
      })
    const base64 = 'data:image/png;base64,AAAA'

    it('create() rejects a payload carrying a data:/base64 image url (no API call)', async () => {
      const api = vi.fn() as unknown as $Fetch
      await expect(
        makeImgRepo(api).create({ documentId: '', title: 'x', image: base64 }),
      ).rejects.toThrow(/base64/i)
      expect(api).not.toHaveBeenCalled()
    })

    it('update() rejects a payload carrying a data:/base64 image url (no API call)', async () => {
      const api = vi.fn() as unknown as $Fetch
      await expect(
        makeImgRepo(api).update('a', { documentId: 'a', title: 'x', image: base64 }),
      ).rejects.toThrow(/base64/i)
      expect(api).not.toHaveBeenCalled()
    })

    it('create() allows a normal hosted (Media Library) image url', async () => {
      const api = vi.fn().mockResolvedValue({ data: { documentId: 'a', title: 'x' } }) as unknown as $Fetch
      await makeImgRepo(api).create({ documentId: '', title: 'x', image: '/uploads/fig.png' })
      expect(api).toHaveBeenCalledWith(BASE, expect.objectContaining({ method: 'POST' }))
    })
  })
})

describe('title search (ListOptions.search)', () => {
  // CRITICAL fix (whole-branch review): `query.filters` as a NESTED OBJECT gets JSON-stringified
  // by ofetch/ufo (no custom serializer on this client — see app/lib/api.ts) and Strapi 5's
  // qs-based parser rejects a string filters param. The wire shape is flat bracket-key params
  // (mirrors lib/upload.ts's live-sandbox-validated `filters[name][$containsi]`), produced by
  // repository.ts spreading `flattenFilters(...)` into the query instead of `filters: <object>`.
  it('maps search to a flat filters[title][$containsi] bracket-key param (not a nested object)', async () => {
    const api = vi.fn().mockResolvedValue({ results: [], pagination: {} }) as unknown as $Fetch
    await makeRepo(api).list({ search: 'police' })
    expect(api).toHaveBeenCalledWith(BASE, expect.objectContaining({
      query: expect.objectContaining({ 'filters[title][$containsi]': 'police' }),
    }))
    // No nested `filters` object ever reaches the query — that's the shape ofetch/ufo would
    // JSON.stringify onto the wire.
    const query = (api as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1].query as Record<string, unknown>
    expect(query.filters).toBeUndefined()
  })

  it('composes with the type filter without clobbering either (both as bracket-key params)', async () => {
    const api = vi.fn().mockResolvedValue({ results: [], pagination: {} }) as unknown as $Fetch
    await makeRepo(api).list({ search: 'police', type: 'update' })
    expect(api).toHaveBeenCalledWith(BASE, expect.objectContaining({
      query: expect.objectContaining({
        'filters[type][$eq]': 'update',
        'filters[title][$containsi]': 'police',
      }),
    }))
  })

  it('sends no title filter (no filters[...] keys at all) for absent/empty/whitespace search', async () => {
    const noFiltersKeys = (query: Record<string, unknown>) =>
      Object.keys(query).some((k) => k.startsWith('filters'))

    const none = vi.fn().mockResolvedValue({ results: [], pagination: {} }) as unknown as $Fetch
    await makeRepo(none).list({})
    expect(noFiltersKeys((none as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1].query)).toBe(false)

    const empty = vi.fn().mockResolvedValue({ results: [], pagination: {} }) as unknown as $Fetch
    await makeRepo(empty).list({ search: '' })
    expect(noFiltersKeys((empty as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1].query)).toBe(false)

    const whitespace = vi.fn().mockResolvedValue({ results: [], pagination: {} }) as unknown as $Fetch
    await makeRepo(whitespace).list({ search: '   ' })
    expect(noFiltersKeys((whitespace as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1].query)).toBe(false)
  })
})

describe('getUpdatedAt (edit-conflict fields-limited read)', () => {
  // Same v0.7.0 wire-format lesson as title search: an array value (`fields: ['updatedAt']`)
  // is NOT the bracket-key shape Strapi 5's qs-based parser expects for a single field, so the
  // param is sent as the flat key 'fields[0]': 'updatedAt' — mirrors flattenFilters's
  // path[i]-for-arrays convention (strapi-rest.ts) — never a nested array/object on the wire.
  it('GETs the entity with a flat fields[0]=updatedAt bracket-key param and returns the stamp', async () => {
    const api = vi.fn().mockResolvedValue({ data: { documentId: 'a', updatedAt: '2026-07-16T10:00:00.000Z' } }) as unknown as $Fetch
    const out = await makeRepo(api).getUpdatedAt('a')
    expect(api).toHaveBeenCalledWith(`${BASE}/a`, expect.objectContaining({
      query: expect.objectContaining({ 'fields[0]': 'updatedAt' }),
    }))
    expect(out).toBe('2026-07-16T10:00:00.000Z')
  })

  it('never sends a raw fields array on the wire — only the flat bracket key', async () => {
    const api = vi.fn().mockResolvedValue({ data: { documentId: 'a', updatedAt: 'x' } }) as unknown as $Fetch
    await makeRepo(api).getUpdatedAt('a')
    const query = (api as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1].query as Record<string, unknown>
    expect(query.fields).toBeUndefined()
  })

  it('returns null when the response has no updatedAt (missing field, no throw)', async () => {
    const api = vi.fn().mockResolvedValue({ data: { documentId: 'a' } }) as unknown as $Fetch
    const out = await makeRepo(api).getUpdatedAt('a')
    expect(out).toBeNull()
  })

  it('returns null (never throws) when the record is missing', async () => {
    const api = vi.fn().mockRejectedValue(new Error('404 Not Found')) as unknown as $Fetch
    await expect(makeRepo(api).getUpdatedAt('nope')).resolves.toBeNull()
  })
})
