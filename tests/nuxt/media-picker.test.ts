// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { MediaRef } from '~/types/content'

const uploaded: MediaRef = {
  id: 42, url: '/uploads/figure_abc123.png', name: 'figure.png',
  alternativeText: 'Bar chart', caption: null, width: 800, height: 600, mime: 'image/png',
}
const uploadMock = vi.fn().mockResolvedValue(uploaded)
const browseMock = vi.fn().mockResolvedValue([uploaded])

mockNuxtImport('useUpload', () => () => ({
  upload: uploadMock,
  browse: browseMock,
  remove: vi.fn(),
}))

import MediaPicker from '~/components/MediaPicker.vue'

describe('MediaPicker', () => {
  beforeEach(() => {
    uploadMock.mockClear()
    browseMock.mockClear()
  })

  it('blocks upload until alt-text is provided', async () => {
    const wrapper = await mountSuspended(MediaPicker)
    const file = new File(['x'], 'figure.png', { type: 'image/png' })

    // Provide a file but NO alt-text → upload is gated.
    await wrapper.vm.$.exposed!.setFile(file)
    await wrapper.vm.$.exposed!.submit()
    expect(uploadMock).not.toHaveBeenCalled()

    // Now add alt-text → upload proceeds.
    await wrapper.vm.$.exposed!.setAlt('Bar chart')
    await wrapper.vm.$.exposed!.submit()
    expect(uploadMock).toHaveBeenCalledWith(file, expect.objectContaining({ alternativeText: 'Bar chart' }))
  })

  it('emits select with a Media-Library URL MediaRef — never a data: URI', async () => {
    const wrapper = await mountSuspended(MediaPicker)
    const file = new File(['x'], 'figure.png', { type: 'image/png' })
    await wrapper.vm.$.exposed!.setFile(file)
    await wrapper.vm.$.exposed!.setAlt('Bar chart')
    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))

    const events = wrapper.emitted('select')
    expect(events).toBeTruthy()
    const ref = events![0][0] as MediaRef
    expect(ref.url).toBe('/uploads/figure_abc123.png')
    expect(ref.url.startsWith('data:')).toBe(false)
  })

  it('in browse mode, selecting a tile emits its (url-based) MediaRef', async () => {
    const wrapper = await mountSuspended(MediaPicker, { props: { mode: 'browse' } })
    await new Promise((r) => setTimeout(r, 0))
    expect(browseMock).toHaveBeenCalled()
    await wrapper.vm.$.exposed!.choose(uploaded)
    const ref = wrapper.emitted('select')![0][0] as MediaRef
    expect(ref.url.startsWith('data:')).toBe(false)
    expect(ref.id).toBe(42)
  })
})
