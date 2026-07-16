// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { MediaRef } from '~/types/content'

function ref(id: number, name: string, alt: string | null = 'Alt'): MediaRef {
  return { id, url: `/uploads/${name}`, name, alternativeText: alt, caption: null, width: null, height: null, mime: 'image/jpeg' }
}
const page1 = Array.from({ length: 20 }, (_, i) => ref(i + 1, `img-${i + 1}.jpg`))
const page2 = [ref(21, 'img-21.jpg'), ref(22, 'no-alt.jpg', null)]

const listMock = vi.fn()
mockNuxtImport('useMediaLibrary', () => () => ({
  list: listMock,
  uploadImage: vi.fn(),
  updateInfo: vi.fn(),
}))

import MediaLibraryGrid from '~/components/MediaLibraryGrid.vue'

describe('MediaLibraryGrid', () => {
  beforeEach(() => {
    listMock.mockReset()
    listMock.mockResolvedValue(page1)
  })

  it('loads and renders the first page on mount, newest first', async () => {
    const wrapper = await mountSuspended(MediaLibraryGrid)
    await new Promise((r) => setTimeout(r, 0))
    expect(listMock).toHaveBeenCalledWith({ page: 1, pageSize: 20, search: undefined })
    expect(wrapper.findAll('[data-test^="library-item-"]')).toHaveLength(20)
  })

  it('clicking a thumbnail emits select with that MediaRef', async () => {
    const wrapper = await mountSuspended(MediaLibraryGrid)
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.find('[data-test="library-item-3"]').trigger('click')
    const emitted = wrapper.emitted('select')![0]![0] as MediaRef
    expect(emitted.id).toBe(3)
  })

  it('Load more appends the next page and hides once a short page arrives', async () => {
    const wrapper = await mountSuspended(MediaLibraryGrid)
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('[data-test="library-load-more"]').exists()).toBe(true)
    listMock.mockResolvedValueOnce(page2)
    await wrapper.find('[data-test="library-load-more"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(listMock).toHaveBeenLastCalledWith({ page: 2, pageSize: 20, search: undefined })
    expect(wrapper.findAll('[data-test^="library-item-"]')).toHaveLength(22)
    expect(wrapper.find('[data-test="library-load-more"]').exists()).toBe(false)
  })

  it('search resets to page 1 and passes the trimmed term', async () => {
    const wrapper = await mountSuspended(MediaLibraryGrid)
    await new Promise((r) => setTimeout(r, 0))
    listMock.mockResolvedValueOnce([page1[0]!])
    wrapper.vm.$.exposed!.__search.value = ' img-1 '
    await wrapper.vm.$.exposed!.__load(true)
    expect(listMock).toHaveBeenLastCalledWith({ page: 1, pageSize: 20, search: 'img-1' })
    expect(wrapper.findAll('[data-test^="library-item-"]')).toHaveLength(1)
  })

  it('marks images that lack alt text with a "no alt text" badge', async () => {
    listMock.mockResolvedValue(page2)
    const wrapper = await mountSuspended(MediaLibraryGrid)
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('[data-test="no-alt-22"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="no-alt-21"]').exists()).toBe(false)
  })

  it('shows the empty state when the library has no images', async () => {
    listMock.mockResolvedValue([])
    const wrapper = await mountSuspended(MediaLibraryGrid)
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('[data-test="library-empty"]').text()).toContain('No images yet')
  })

  it('shows an inline error with Retry when loading fails, and Retry reloads', async () => {
    listMock.mockRejectedValueOnce(new Error('boom'))
    const wrapper = await mountSuspended(MediaLibraryGrid)
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('[data-test="library-error"]').exists()).toBe(true)
    listMock.mockResolvedValueOnce(page1)
    await wrapper.find('[data-test="library-retry"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.findAll('[data-test^="library-item-"]')).toHaveLength(20)
  })
})
