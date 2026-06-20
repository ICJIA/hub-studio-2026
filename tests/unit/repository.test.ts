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
})
