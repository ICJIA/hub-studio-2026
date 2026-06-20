// tests/nuxt/preview-page.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { Article } from '~/types/content'

const article: Partial<Article> = {
  documentId: 'a1', title: 'Evaluation of Youth Summer Job Program',
  markdown: '# Findings\n\n![Bar chart](/uploads/figure_abc.png)',
  splash: { id: 10, url: '/uploads/splash_abc.png', alternativeText: 'Splash', caption: null, name: 's.png' },
}
const findOneMock = vi.fn().mockResolvedValue(article)
mockNuxtImport('useArticles', () => () => ({ list: vi.fn(), findOne: findOneMock, create: vi.fn(), update: vi.fn(), remove: vi.fn() }))
mockNuxtImport('useRoute', () => () => ({ params: { type: 'article', documentId: 'a1' } }))

import PreviewPage from '~/pages/preview/[type]/[documentId].vue'

describe('preview page', () => {
  it('findOne the draft and renders markdown via renderMarkdown (url images, no data:)', async () => {
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    expect(findOneMock).toHaveBeenCalledWith('a1', expect.objectContaining({ status: 'draft' }))
    const html = wrapper.find('.prose-preview').html()
    expect(html).toMatch(/<h1[^>]*>Findings<\/h1>/)
    expect(html).toMatch(/<img[^>]+src="\/uploads\/figure_abc\.png"/)
    expect(html).not.toMatch(/data:/)
  })
})
