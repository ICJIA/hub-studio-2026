// tests/nuxt/publish-button.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { Article } from '~/types/content'

const canPublish = ref(false)
mockNuxtImport('useAuth', () => () => ({
  user: computed(() => ({ email: 'manager@example.com' })),
  canPublish, isLoggedIn: computed(() => true), logout: vi.fn(),
}))

const publishMock = vi.fn(async (id: string): Promise<Article> => ({
  documentId: id, title: 'Crime In Illinois', publishedAt: '2026-06-20T12:00:00.000Z',
} as Article))
const unpublishMock = vi.fn(async (id: string): Promise<Article> => ({
  documentId: id, title: 'Crime In Illinois', publishedAt: null,
} as Article))
mockNuxtImport('useArticles', () => () => ({
  list: vi.fn(), findOne: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(),
  publish: publishMock, unpublish: unpublishMock,
}))

const toastAdd = vi.fn()
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

import PublishButton from '~/components/PublishButton.vue'

describe('PublishButton (canPublish-aware: hidden for authors, active for editors)', () => {
  beforeEach(() => { publishMock.mockClear(); unpublishMock.mockClear(); toastAdd.mockClear() })

  it('for a NON-publisher (author) the control renders NOTHING — default-deny', async () => {
    canPublish.value = false
    const wrapper = await mountSuspended(PublishButton, { props: { type: 'article', documentId: 'a1' } })
    // No publish affordance at all: no "Publish"/"Unpublish" text and no button.
    expect(wrapper.text()).not.toMatch(/Publish/i)
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('a non-publisher never reaches repo.publish/unpublish (nothing rendered to click)', async () => {
    canPublish.value = false
    const wrapper = await mountSuspended(PublishButton, { props: { type: 'article', documentId: 'a1' } })
    await new Promise((r) => setTimeout(r, 0))
    expect(publishMock).not.toHaveBeenCalled()
    expect(unpublishMock).not.toHaveBeenCalled()
    // The confirm dialog is closed and unreachable.
    expect(wrapper.vm.$.exposed!.open.value).toBe(false)
  })

  it('for a publisher, confirming calls repo.publish(documentId) and emits the published entity', async () => {
    canPublish.value = true
    const wrapper = await mountSuspended(PublishButton, { props: { type: 'article', documentId: 'a1' } })
    expect(wrapper.text()).toMatch(/Publish/i)
    // Active button: rendered and not disabled.
    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()

    await wrapper.vm.$.exposed!.confirmPublish()
    await new Promise((r) => setTimeout(r, 0))

    expect(publishMock).toHaveBeenCalledWith('a1')
    const emitted = wrapper.emitted('published')
    expect(emitted).toBeTruthy()
    const firstEmit = (emitted as Article[][])[0]!
    expect(firstEmit[0]!.publishedAt).toBe('2026-06-20T12:00:00.000Z')
  })

  it('for a PUBLISHED entry, the button reads "Unpublish" and confirming calls repo.unpublish, emitting the now-draft entity', async () => {
    canPublish.value = true
    const wrapper = await mountSuspended(PublishButton, { props: { type: 'article', documentId: 'a1', published: true } })
    expect(wrapper.text()).toMatch(/Unpublish/i)

    await wrapper.vm.$.exposed!.confirmUnpublish()
    await new Promise((r) => setTimeout(r, 0))

    expect(unpublishMock).toHaveBeenCalledWith('a1')
    expect(publishMock).not.toHaveBeenCalled()
    const emitted = wrapper.emitted('published')
    expect(emitted).toBeTruthy()
    const firstEmit = (emitted as Article[][])[0]!
    expect(firstEmit[0]!.publishedAt).toBeNull()
  })
})
