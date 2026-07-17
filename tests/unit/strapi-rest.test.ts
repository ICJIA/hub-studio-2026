import { describe, it, expect } from 'vitest'
import { withQuery } from 'ufo'
import {
  unwrapList, unwrapOne, mediaFromStrapi, mediaIdForWrite,
  relationsFromList, relationsToWrite, flattenFilters,
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

// CRITICAL fix (whole-branch review): ofetch has no custom query serializer, so a nested-object
// query value (e.g. `filters: { title: { $containsi: 'x' } }`) is JSON.stringified by ufo's
// encodeQueryValue (node_modules/ufo/dist/index.mjs) before it ever reaches the wire — and
// Strapi 5's qs-based query parser (shared by the Content API, Upload plugin, and
// Content-Manager admin API alike — all mounted on one Koa app with global koa-qs bracket-key
// parsing) rejects a STRING filters param. flattenFilters pre-flattens every leaf to a scalar,
// bracket-keyed query param — the same shape already validated live for the Upload API
// (lib/upload.ts's `filters[name][$containsi]`) — so ofetch never has a nested object to
// JSON.stringify in the first place.
describe('flattenFilters (Strapi bracket-key query params)', () => {
  it('flattens a single-operator filter to one bracket-key param', () => {
    expect(flattenFilters({ title: { $containsi: 'police' } })).toEqual({
      'filters[title][$containsi]': 'police',
    })
  })

  it('flattens multiple top-level filter fields independently (no clobbering)', () => {
    expect(flattenFilters({ type: { $eq: 'update' }, title: { $containsi: 'police' } })).toEqual({
      'filters[type][$eq]': 'update',
      'filters[title][$containsi]': 'police',
    })
  })

  it('recurses through arbitrarily nested objects (e.g. a logical $and/$or wrapper)', () => {
    expect(flattenFilters({ authorEmail: { $eq: 'a@x.gov' } })).toEqual({
      'filters[authorEmail][$eq]': 'a@x.gov',
    })
  })

  it('indexes array values as [i] (e.g. $or: [{...}, {...}])', () => {
    expect(flattenFilters({ $or: [{ title: { $containsi: 'a' } }, { title: { $containsi: 'b' } }] })).toEqual({
      'filters[$or][0][title][$containsi]': 'a',
      'filters[$or][1][title][$containsi]': 'b',
    })
  })

  it('passes number and boolean leaves through as scalars (not stringified)', () => {
    expect(flattenFilters({ views: { $gt: 10 }, resolved: { $eq: false } })).toEqual({
      'filters[views][$gt]': 10,
      'filters[resolved][$eq]': false,
    })
  })

  it('drops null/undefined leaves (nothing meaningful to send)', () => {
    expect(flattenFilters({ deletedAt: { $eq: null } })).toEqual({})
  })

  it('empty filters object flattens to an empty object (no stray "filters" key)', () => {
    expect(flattenFilters({})).toEqual({})
  })

  it('honors a custom prefix', () => {
    expect(flattenFilters({ title: { $containsi: 'x' } }, 'q')).toEqual({ 'q[title][$containsi]': 'x' })
  })

  // The direct wire-shape proof: run the flattened output through ufo's REAL withQuery (the
  // exact function ofetch calls internally — see ofetch/dist/shared/*.mjs: `withQuery(context.
  // request, context.options.query)`) and assert the resulting URL carries bracket-key params
  // with NO JSON in it. This is the empirical crux of the whole finding.
  it('REAL ofetch/ufo serialization: the flattened query produces bracket-key params, never a JSON blob', () => {
    const flat = flattenFilters({ title: { $containsi: 'police' } })
    const url = withQuery('/content-manager/collection-types/api::article.article', flat)
    expect(url).toBe('/content-manager/collection-types/api::article.article?filters%5Btitle%5D%5B$containsi%5D=police')
    expect(url).not.toContain('%7B') // no JSON `{` ever reaches the wire
    expect(url).not.toContain('%22') // no JSON `"` either
  })

  // RED evidence for the bug this fix closes: the OLD code's nested-object query value, run
  // through the SAME real ufo.withQuery, proves the wire carried a JSON string — reproducing
  // the exact `filters=%7B%22title%22...` shape the reviewer observed against the live sandbox.
  it('(documents the bug) the OLD nested-object query shape JSON-stringifies onto the wire', () => {
    const url = withQuery('/content-manager/collection-types/api::article.article', {
      filters: { title: { $containsi: 'police' } },
    })
    expect(url).toContain('filters=%7B%22title%22')
  })
})
