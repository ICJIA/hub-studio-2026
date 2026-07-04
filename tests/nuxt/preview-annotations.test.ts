// tests/nuxt/preview-annotations.test.ts
// @vitest-environment nuxt
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useAuthStore } from '~/stores/auth'
import { makeDevAdminSession } from '~/lib/dev-auth'
import { annotationsStorageKey, ANNOTATIONS_STORAGE_PREFIX } from '~/lib/annotations/store-local'
import type { Article } from '~/types/content'
import type { ReviewAnnotation } from '~/types/annotations'

const article: Partial<Article> = {
  documentId: 'a1', title: 'Annotated Draft',
  markdown: 'The quick brown fox jumps over the lazy dog.',
}
const findOneMock = vi.fn().mockResolvedValue(article)
mockNuxtImport('useArticles', () => () => ({ list: vi.fn(), findOne: findOneMock, create: vi.fn(), update: vi.fn(), remove: vi.fn() }))
mockNuxtImport('useRoute', () => () => ({ params: { type: 'article', documentId: 'a1' } }))

import PreviewPage from '~/pages/preview/[type]/[documentId].vue'

const seed: ReviewAnnotation = {
  id: 'seed-1', contentType: 'article', documentId: 'a1',
  anchor: { exact: 'brown fox', prefix: 'The quick ', suffix: ' jumps over', offset: 10 },
  color: 'green', resolved: false, createdAt: '2026-07-04T00:00:00.000Z',
  createdBy: { name: 'Dev Editor', email: 'dev-editor@localhost', roleLabel: 'Editor · demo' },
  comments: [{ id: 'c1', body: 'Consider a citation here.', authorName: 'Dev Editor', authorEmail: 'dev-editor@localhost', createdAt: '2026-07-04T00:00:00.000Z' }],
}

beforeEach(() => {
  for (let i = window.localStorage.length - 1; i >= 0; i--) {
    const k = window.localStorage.key(i)
    if (k?.startsWith(ANNOTATIONS_STORAGE_PREFIX)) window.localStorage.removeItem(k)
  }
  useAuthStore().setSession(makeDevAdminSession('editor'))
  window.localStorage.setItem(annotationsStorageKey('article', 'a1'), JSON.stringify([seed]))
})

describe('preview page — annotations', () => {
  it('mounts the reviewer bar and rail with the stored thread', async () => {
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0)) // load → nextTick paint
    expect(wrapper.find('[data-test="ann-arm"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Consider a citation here.')
  })
  it('paints the stored annotation over the rendered markdown', async () => {
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    const mark = wrapper.find('mark[data-ann-id="seed-1"]')
    expect(mark.exists()).toBe(true)
    expect(mark.text()).toBe('brown fox')
    expect(mark.classes()).toContain('ann--green')
  })
  it('shows an orphan flag when the quote no longer matches', async () => {
    window.localStorage.setItem(annotationsStorageKey('article', 'a1'), JSON.stringify([
      { ...seed, id: 'ghost', anchor: { exact: 'vanished words', prefix: '', suffix: '', offset: 3 } },
    ]))
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('mark[data-ann-id="ghost"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('text changed — highlight not found')
  })
  it('resolving via the rail unpaints under the default open filter', async () => {
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.find('[data-test="ann-resolve"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('mark[data-ann-id="seed-1"]').exists()).toBe(false)
  })
})
