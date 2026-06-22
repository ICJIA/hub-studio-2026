import { describe, it, expect } from 'vitest'
import { articleFromStrapi, articleToWrite } from '~/lib/mappers/article'
import { rawArticle, relDatasets } from '../fixtures/strapi'
import { relationsFromList } from '~/lib/strapi-rest'

describe('articleFromStrapi', () => {
  // Hydrate relations the way the repository will: from the relations endpoint, not the entity.
  const a = articleFromStrapi(rawArticle as never, { datasets: relationsFromList(relDatasets) })

  it('keeps documentId and core fields, ignoring legacy id/status', () => {
    expect(a.documentId).toBe('igo619j501vpj10sg8ecfv74')
    expect(a).not.toHaveProperty('legacyId')
    expect(a).not.toHaveProperty('status')
    expect(a.publishedAt).toBe('2026-03-16T18:45:02.898Z')
  })
  it('flattens inline media (with caption) to MediaRef', () => {
    expect(a.splash).toEqual({ id: 10, url: '/uploads/splash_abc.png', name: 'splash.png', alternativeText: 'Splash alt', caption: null, width: 1200, height: 630, mime: 'image/png' })
    expect(a.thumbnail).toBeNull()
  })
  it('flattens the MULTIPLE mainfile media array to mainfiles: MediaRef[]', () => {
    expect(a.mainfiles).toHaveLength(2)
    expect(a.mainfiles.map((f) => f.id)).toEqual([11, 12])
    expect(a.mainfiles.map((f) => f.name)).toEqual(['report.pdf', 'appendix.pdf'])
    expect(a.mainfiles[0]!.url).toBe('/uploads/report_abc.pdf')
  })
  it('takes relations from the relations argument ({documentId,title}, no slug); ignores the entity {count}', () => {
    expect(a.datasets).toEqual([{ documentId: 'dsdoc1', title: 'Crime Data' }])
    expect(a.apps).toEqual([]) // not supplied → defaults to []
  })
  it('preserves JSON arrays as-is (images keep alt + caption)', () => {
    expect(a.authors).toEqual([{ title: 'Jessica Reichert', description: "Manages ICJIA's CJRE." }])
    expect(a.images).toEqual([{ title: 'figure1', src: '/uploads/figure1_fdafcd09e1.png', alt: 'Bar chart of outcomes', caption: 'Figure 1.' }])
  })
})

describe('articleToWrite', () => {
  it('converts media to numeric id and omits relation fields (relation-write deferred)', () => {
    const w = articleToWrite(articleFromStrapi(rawArticle as never, { datasets: relationsFromList(relDatasets) }))
    expect(w.splash).toBe(10)
    expect(w.thumbnail).toBeNull()
    expect(w).not.toHaveProperty('apps')
    expect(w).not.toHaveProperty('datasets')
    expect(w).not.toHaveProperty('documentId')
    expect(w).not.toHaveProperty('publishedAt')
  })
  it('round-trips mainfiles to an array of numeric ids (mainfiles: number[])', () => {
    const w = articleToWrite(articleFromStrapi(rawArticle as never))
    expect(w.mainfiles).toEqual([11, 12])
  })
  it('drops display-only (id <= 0) main files from the write payload', () => {
    const w = articleToWrite({
      ...articleFromStrapi(rawArticle as never),
      mainfiles: [
        { id: 0, url: '/files/demo/sample-report-01.pdf', name: 'sample-report-01.pdf' },
        { id: 11, url: '/uploads/report_abc.pdf', name: 'report.pdf' },
      ],
    })
    expect(w.mainfiles).toEqual([11])
  })
})
