// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { MediaRef } from '~/types/content'
import { toMarkdown } from '~/components/image-markdown'

const uploaded: MediaRef = {
  id: 7, url: '/uploads/chart_xyz.png', name: 'chart.png',
  alternativeText: 'Outcome chart', caption: 'Figure 2.', width: 640, height: 480, mime: 'image/png',
}
const uploadMock = vi.fn().mockResolvedValue(uploaded)

mockNuxtImport('useUpload', () => () => ({
  upload: uploadMock,
  browse: vi.fn().mockResolvedValue([]),
  remove: vi.fn(),
}))

import ImageDropzone from '~/components/ImageDropzone.vue'

describe('toMarkdown', () => {
  it('builds ![alt](url "caption") with a caption', () => {
    expect(toMarkdown(uploaded)).toBe('![Outcome chart](/uploads/chart_xyz.png "Figure 2.")')
  })
  it('omits the title segment when there is no caption', () => {
    expect(toMarkdown({ ...uploaded, caption: null })).toBe('![Outcome chart](/uploads/chart_xyz.png)')
  })
})

describe('ImageDropzone', () => {
  beforeEach(() => uploadMock.mockClear())

  it('eager-uploads a dropped file and renders a thumbnail from its url (not base64)', async () => {
    const wrapper = await mountSuspended(ImageDropzone)
    const file = new File(['x'], 'chart.png', { type: 'image/png' })
    await wrapper.vm.$.exposed!.handleFiles([file])
    await new Promise((r) => setTimeout(r, 0))

    expect(uploadMock).toHaveBeenCalledWith(file)
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('/uploads/chart_xyz.png')
    expect(img.attributes('src')!.startsWith('data:')).toBe(false)
  })

  it('clicking a thumbnail emits insert with the ![alt](url "caption") snippet', async () => {
    const wrapper = await mountSuspended(ImageDropzone)
    await wrapper.vm.$.exposed!.handleFiles([new File(['x'], 'chart.png', { type: 'image/png' })])
    await new Promise((r) => setTimeout(r, 0))

    await wrapper.find('button.thumb').trigger('click')
    const snippet = wrapper.emitted('insert')![0][0] as string
    expect(snippet).toBe('![Outcome chart](/uploads/chart_xyz.png "Figure 2.")')
    expect(snippet).not.toMatch(/data:/)
  })
})
