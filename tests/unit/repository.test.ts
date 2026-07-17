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
  it('maps search to filters[title][$containsi]', async () => {
    const api = vi.fn().mockResolvedValue({ results: [], pagination: {} }) as unknown as $Fetch
    await makeRepo(api).list({ search: 'police' })
    expect(api).toHaveBeenCalledWith(BASE, expect.objectContaining({
      query: expect.objectContaining({ filters: { title: { $containsi: 'police' } } }),
    }))
  })

  it('composes with the type filter without clobbering either', async () => {
    const api = vi.fn().mockResolvedValue({ results: [], pagination: {} }) as unknown as $Fetch
    await makeRepo(api).list({ search: 'police', type: 'update' })
    expect(api).toHaveBeenCalledWith(BASE, expect.objectContaining({
      query: expect.objectContaining({
        filters: { type: { $eq: 'update' }, title: { $containsi: 'police' } },
      }),
    }))
  })

  it('sends no title filter for absent/empty/whitespace search', async () => {
    const none = vi.fn().mockResolvedValue({ results: [], pagination: {} }) as unknown as $Fetch
    await makeRepo(none).list({})
    expect((none as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1].query.filters).toBeUndefined()

    const empty = vi.fn().mockResolvedValue({ results: [], pagination: {} }) as unknown as $Fetch
    await makeRepo(empty).list({ search: '' })
    expect((empty as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1].query.filters).toBeUndefined()

    const whitespace = vi.fn().mockResolvedValue({ results: [], pagination: {} }) as unknown as $Fetch
    await makeRepo(whitespace).list({ search: '   ' })
    expect((whitespace as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1].query.filters).toBeUndefined()
  })
})
