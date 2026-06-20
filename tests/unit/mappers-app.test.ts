import { describe, it, expect } from 'vitest'
import { appFromStrapi, appToWrite } from '~/lib/mappers/app'
import { rawApp, relDatasets } from '../fixtures/strapi'
import { relationsFromList } from '~/lib/strapi-rest'

describe('appFromStrapi / appToWrite', () => {
  const app = appFromStrapi(rawApp as never, { datasets: relationsFromList(relDatasets) })
  it('maps inline image (with caption) + contributors, and takes relations from the relations arg', () => {
    expect(app.image).toEqual({ id: 1046, url: '/uploads/app_image_22cc0163e1.png', name: 'app-image.png', alternativeText: 'App screenshot', caption: null, width: 720, height: 342, mime: 'image/png' })
    expect(app.contributors).toEqual([{ title: 'ICJIA R&A staff' }])
    expect(app.datasets).toEqual([{ documentId: 'dsdoc1', title: 'Crime Data' }])
    expect(app.articles).toEqual([]) // not supplied → []
  })
  it('writes image id and omits relation fields (relation-write deferred)', () => {
    const w = appToWrite(app)
    expect(w.image).toBe(1046)
    expect(w).not.toHaveProperty('datasets')
    expect(w).not.toHaveProperty('articles')
  })
})
