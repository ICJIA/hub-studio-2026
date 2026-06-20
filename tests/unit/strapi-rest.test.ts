import { describe, it, expect } from 'vitest'
import {
  unwrapList, unwrapOne, mediaFromStrapi, mediaIdForWrite,
  relationsFromList, relationsToWrite,
} from '~/lib/strapi-rest'

describe('strapi-rest helpers', () => {
  it('unwraps Content-Manager list ({results,pagination}) and single ({data}) envelopes', () => {
    expect(unwrapList({ results: [1, 2], pagination: { page: 1, pageSize: 25, pageCount: 1, total: 2 } })).toEqual([1, 2])
    expect(unwrapOne({ data: { documentId: 'x' } })).toEqual({ documentId: 'x' })
  })

  it('maps an inline media object (with caption) to a MediaRef and back to its numeric id', () => {
    const media = { id: 10, documentId: 'm', name: 's.png', alternativeText: 'Splash alt', caption: 'Fig. 1', url: '/uploads/s.png', width: 1200, height: 630, mime: 'image/png' }
    expect(mediaFromStrapi(media)).toEqual({ id: 10, url: '/uploads/s.png', name: 's.png', alternativeText: 'Splash alt', caption: 'Fig. 1', width: 1200, height: 630, mime: 'image/png' })
    expect(mediaFromStrapi(null)).toBeNull()
    expect(mediaIdForWrite(mediaFromStrapi(media))).toBe(10)
    expect(mediaIdForWrite(null)).toBeNull()
  })

  it('maps a relations-endpoint response ({results}) to RelationRef[] (no slug) and back to documentId[]', () => {
    const rel = { results: [{ id: 5, documentId: 'd1', title: 'Crime Data', publishedAt: '2026-03-16T18:45:02.898Z', status: 'published' }], pagination: { page: 1, pageSize: 10, pageCount: 1, total: 1 } }
    expect(relationsFromList(rel)).toEqual([{ documentId: 'd1', title: 'Crime Data' }])
    expect(relationsFromList({ results: [], pagination: { page: 1, pageSize: 10, pageCount: 0, total: 0 } })).toEqual([])
    // relationsToWrite is exported for later plans (relation-write is deferred); still verify its shape.
    expect(relationsToWrite([{ documentId: 'd1', title: 'Crime Data' }])).toEqual(['d1'])
  })
})
