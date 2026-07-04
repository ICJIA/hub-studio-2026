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
/** A second open thread on the same document — for the consecutive-identical-announcement case. */
const seed2: ReviewAnnotation = {
  ...seed, id: 'seed-2',
  anchor: { exact: 'lazy dog', prefix: 'over the ', suffix: '.', offset: 35 },
  comments: [{ ...seed.comments[0]!, id: 'c2', body: 'Second note.' }],
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
  it('renders no global ann-card ids anywhere (desktop rail + mobile drawer mount concurrently)', async () => {
    const wrapper = await mountSuspended(PreviewPage, { attachTo: document.body })
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.text()).toContain('Consider a citation here.') // rail(s) rendered with the thread
    expect(document.querySelectorAll('[id^="ann-card-"]')).toHaveLength(0)
    wrapper.unmount()
  })
  it('keyboard-activating a mark (Enter) keeps focus on the highlight after repaint', async () => {
    const wrapper = await mountSuspended(PreviewPage, { attachTo: document.body })
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    const mark = wrapper.find('mark[data-ann-id="seed-1"]')
    expect(mark.exists()).toBe(true)
    ;(mark.element as HTMLElement).focus()
    await mark.trigger('keydown', { key: 'Enter' })
    await new Promise((r) => setTimeout(r, 0))
    const active = document.activeElement as HTMLElement | null
    expect(active?.tagName).toBe('MARK')
    expect(active?.getAttribute('data-ann-id')).toBe('seed-1')
    wrapper.unmount()
  })
  it('reloads on a storage event for THIS document\'s exact key and ignores other keys', async () => {
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('mark[data-ann-id="seed-1"]').exists()).toBe(true)
    // Another tab clears THIS doc's storage, but the event is keyed to a DIFFERENT doc → ignore.
    window.localStorage.setItem(annotationsStorageKey('article', 'a1'), JSON.stringify([]))
    window.dispatchEvent(new StorageEvent('storage', { key: annotationsStorageKey('article', 'other-doc') }))
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('mark[data-ann-id="seed-1"]').exists()).toBe(true)
    // The event for this doc's exact key → reload + repaint picks up the cleared list.
    window.dispatchEvent(new StorageEvent('storage', { key: annotationsStorageKey('article', 'a1') }))
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('mark[data-ann-id="seed-1"]').exists()).toBe(false)
  })
  it('re-announces consecutive identical status messages (live region blanks between them)', async () => {
    window.localStorage.setItem(annotationsStorageKey('article', 'a1'), JSON.stringify([seed, seed2]))
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.find('[data-test="ann-resolve"]').trigger('click') // resolve thread 1
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    const status = wrapper.find('p[role="status"]')
    expect(status.text()).toBe('Thread resolved')
    // Screen readers only re-announce a live region when its DOM actually mutates. Count
    // mutations during the SECOND identical announcement — a plain `announce = same-string`
    // write never touches the DOM (Vue skips identical ref writes), so nothing is re-announced.
    let mutations = 0
    const observer = new MutationObserver((records) => { mutations += records.length })
    observer.observe(status.element, { childList: true, characterData: true, subtree: true })
    await wrapper.find('[data-test="ann-resolve"]').trigger('click') // resolve thread 2 → same message
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    mutations += observer.takeRecords().length
    observer.disconnect()
    expect(status.text()).toBe('Thread resolved')
    expect(mutations).toBeGreaterThan(0)
  })
})
