// tests/nuxt/preview-page.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { Article, Dataset } from '~/types/content'

const article: Partial<Article> = {
  documentId: 'a1', title: 'Evaluation of Youth Summer Job Program',
  markdown: '# Findings\n\n![Bar chart](/uploads/figure_abc.png)',
  splash: { id: 10, url: '/uploads/splash_abc.png', alternativeText: 'Splash', caption: null, name: 's.png' },
}
const findOneMock = vi.fn().mockResolvedValue(article)
mockNuxtImport('useArticles', () => () => ({ list: vi.fn(), findOne: findOneMock, create: vi.fn(), update: vi.fn(), remove: vi.fn() }))

// Dataset mock (variables omitted — the sparse-draft crash case)
const datasetFindOneMock = vi.fn().mockResolvedValue({ documentId: 'd1', title: 'Crime Dataset' } as Partial<Dataset>)
mockNuxtImport('useDatasets', () => () => ({ list: vi.fn(), findOne: datasetFindOneMock, create: vi.fn(), update: vi.fn(), remove: vi.fn() }))

// App mock for XSS test
const appFindOneMock = vi.fn().mockResolvedValue({
  documentId: 'app1', title: 'Test App', url: 'javascript:alert(1)',
})
mockNuxtImport('useApps', () => () => ({ list: vi.fn(), findOne: appFindOneMock, create: vi.fn(), update: vi.fn(), remove: vi.fn() }))

// useRoute is mocked per test by replacing routeParams
let routeParams: { type: string; documentId: string } = { type: 'article', documentId: 'a1' }
mockNuxtImport('useRoute', () => () => ({ params: routeParams }))

import PreviewPage from '~/pages/preview/[type]/[documentId].vue'

describe('preview page', () => {
  it('findOne the draft and renders markdown via renderMarkdown (url images, no data:)', async () => {
    routeParams = { type: 'article', documentId: 'a1' }
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    expect(findOneMock).toHaveBeenCalledWith('a1', expect.objectContaining({ status: 'draft' }))
    const html = wrapper.find('.prose-preview').html()
    expect(html).toMatch(/<h1[^>]*>Findings<\/h1>/)
    expect(html).toMatch(/<img[^>]+src="\/uploads\/figure_abc\.png"/)
    expect(html).not.toMatch(/data:/)
  })

  it('renders not-found state and does not crash when findOne returns null', async () => {
    routeParams = { type: 'article', documentId: 'missing-doc' }
    findOneMock.mockResolvedValueOnce(null)
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.text()).toContain('Not found.')
    expect(wrapper.find('article').exists()).toBe(false)
  })

  it('renders dataset with sparse draft (variables undefined) without crashing', async () => {
    routeParams = { type: 'dataset', documentId: 'd1' }
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    expect(datasetFindOneMock).toHaveBeenCalledWith('d1', expect.objectContaining({ status: 'draft' }))
    expect(wrapper.text()).toContain('Crime Dataset')
    // variables section must NOT appear (undefined → falsy length guard)
    expect(wrapper.text()).not.toContain('Variables')
  })

  it('never lets a javascript: url reach the DOM as an Open app link', async () => {
    routeParams = { type: 'app', documentId: 'app1' }
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    // safeHref maps the hostile url to '#', and PublishedAppPreview hides the link rather than
    // rendering a dead anchor — so no javascript: href ever reaches the DOM.
    expect(wrapper.html()).not.toContain('javascript:')
    expect(wrapper.findAll('a').every((l) => l.attributes('href') !== 'javascript:alert(1)')).toBe(true)
  })

  it('renders the Open app link for a safe url', async () => {
    routeParams = { type: 'app', documentId: 'app1' }
    appFindOneMock.mockResolvedValueOnce({ documentId: 'app1', title: 'Test App', url: 'https://example.com/app' })
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    const link = wrapper.findAll('a').find((l) => l.text().includes('Open app'))
    expect(link?.attributes('href')).toBe('https://example.com/app')
  })
})
