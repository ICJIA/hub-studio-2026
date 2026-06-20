// tests/unit/repositories.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createArticlesRepository } from '~/repositories/articles'
import { createAppsRepository } from '~/repositories/apps'
import { createDatasetsRepository } from '~/repositories/datasets'
import { rawArticle, rawApp, rawDataset, relDatasets, relApps, relArticles } from '../fixtures/strapi'
import type { $Fetch } from 'ofetch'

describe('per-type repositories (Content-Manager API)', () => {
  it('articles repo hits the article uid, hydrates apps+datasets relations, and maps via articleFromStrapi', async () => {
    const mockFn = vi.fn()
      .mockResolvedValueOnce({ data: rawArticle }) // entity
      .mockResolvedValueOnce(relApps) // apps relation
      .mockResolvedValueOnce(relDatasets) // datasets relation
    const api = mockFn as unknown as $Fetch
    const a = await createArticlesRepository(api).findOne('igo619j501vpj10sg8ecfv74')
    expect(api).toHaveBeenNthCalledWith(1, '/content-manager/collection-types/api::article.article/igo619j501vpj10sg8ecfv74', expect.anything())
    // Relation GETs are URL-only (no options).
    expect(api).toHaveBeenNthCalledWith(2, '/content-manager/relations/api::article.article/igo619j501vpj10sg8ecfv74/apps')
    expect(api).toHaveBeenNthCalledWith(3, '/content-manager/relations/api::article.article/igo619j501vpj10sg8ecfv74/datasets')
    expect(a.splash?.id).toBe(10)
    expect(a.datasets[0].documentId).toBe('dsdoc1')
    expect(a.datasets[0]).not.toHaveProperty('slug') // relations endpoint returns no slug
  })

  it('apps repo lists the app uid ({results}) and maps contributors', async () => {
    const api = vi.fn().mockResolvedValue({ results: [rawApp], pagination: {} }) as unknown as $Fetch
    const [app] = await createAppsRepository(api).list({ status: 'published' })
    expect(api).toHaveBeenCalledWith('/content-manager/collection-types/api::app.app', expect.anything())
    expect(app.contributors).toEqual([{ title: 'ICJIA R&A staff' }])
  })

  it('datasets repo hits the dataset uid, hydrates apps+articles relations, and maps timeperiod', async () => {
    const mockFn = vi.fn()
      .mockResolvedValueOnce({ data: rawDataset }) // entity
      .mockResolvedValueOnce(relApps) // apps relation
      .mockResolvedValueOnce(relArticles) // articles relation
    const api = mockFn as unknown as $Fetch
    const ds = await createDatasetsRepository(api).findOne('dsdoc1')
    expect(api).toHaveBeenNthCalledWith(1, '/content-manager/collection-types/api::dataset.dataset/dsdoc1', expect.anything())
    expect(ds.timeperiod).toEqual({ yeartype: 'calendar', yearmin: 1982, yearmax: 2020 })
    expect(ds.apps[0].documentId).toBe('appdoc1')
  })
})
