// tests/nuxt/body-images-field.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { MediaRef } from '~/types/content'

const uploaded: MediaRef = {
  id: 9, url: '/uploads/figure_abc.png', name: 'figure.png',
  alternativeText: 'A chart', caption: null, width: 64, height: 64, mime: 'image/png',
}
const uploadMock = vi.fn().mockResolvedValue(uploaded)
mockNuxtImport('useUpload', () => () => ({ upload: uploadMock, browse: vi.fn().mockResolvedValue([]), remove: vi.fn() }))

import BodyImagesField from '~/components/forms/BodyImagesField.vue'

describe('BodyImagesField (sidebar body-image insert panel)', () => {
  it('uploading via __handleFiles adds a tray entry WITHOUT emitting an insert', async () => {
    uploadMock.mockClear()
    const wrapper = await mountSuspended(BodyImagesField)
    const file = new File(['x'], 'figure.png', { type: 'image/png' })
    await wrapper.vm.$.exposed!.__handleFiles([file])
    await new Promise((r) => setTimeout(r, 0))
    expect(uploadMock).toHaveBeenCalledWith(file)
    const tray = wrapper.vm.$.exposed!.__trayImages.value as Array<{ id: number; ref: MediaRef; alt: string; position: string; align: string }>
    expect(tray).toHaveLength(1)
    expect(tray[0]!.ref.url).toBe('/uploads/figure_abc.png')
    // Per-image defaults: alt seeded from the ref, Below + Centered.
    expect(tray[0]!.alt).toBe('A chart')
    expect(tray[0]!.position).toBe('below')
    expect(tray[0]!.align).toBe('center')
    // No insert emitted on upload.
    expect(wrapper.emitted('insert')).toBeFalsy()
  })

  it('Insert builds the figure markdown from the entry controls and emits it', async () => {
    const wrapper = await mountSuspended(BodyImagesField)
    const entry = wrapper.vm.$.exposed!.__addToTray(uploaded, 'figure.png')
    entry.alt = 'Outcome chart'
    entry.caption = 'Figure 2.'
    entry.position = 'below'
    entry.align = 'center'
    wrapper.vm.$.exposed!.__insertEntry(entry)
    const emitted = wrapper.emitted('insert') as unknown[][]
    expect(emitted).toBeTruthy()
    expect(emitted.at(-1)![0]).toBe('![Outcome chart](/uploads/figure_abc.png)\n\n*Figure 2.*\n')
  })

  it('Insert is a no-op when alt is empty (required)', async () => {
    const wrapper = await mountSuspended(BodyImagesField)
    const entry = wrapper.vm.$.exposed!.__addToTray({ ...uploaded, alternativeText: null }, '   ')
    entry.alt = ''
    wrapper.vm.$.exposed!.__insertEntry(entry)
    expect(wrapper.emitted('insert')).toBeFalsy()
  })

  it('a left-aligned caption appends the {.fig-caption-left} tag', async () => {
    const wrapper = await mountSuspended(BodyImagesField)
    const entry = wrapper.vm.$.exposed!.__addToTray(uploaded, 'figure.png')
    entry.alt = 'Outcome chart'
    entry.caption = 'Figure 2.'
    entry.position = 'above'
    entry.align = 'left'
    wrapper.vm.$.exposed!.__insertEntry(entry)
    const emitted = wrapper.emitted('insert') as unknown[][]
    expect(emitted.at(-1)![0]).toBe('*Figure 2.*{.fig-caption-left}\n\n![Outcome chart](/uploads/figure_abc.png)\n')
  })

  it('the inserted markdown is never base64 (hosted url)', async () => {
    const wrapper = await mountSuspended(BodyImagesField)
    const entry = wrapper.vm.$.exposed!.__addToTray(uploaded, 'figure.png')
    entry.alt = 'chart'
    wrapper.vm.$.exposed!.__insertEntry(entry)
    const emitted = wrapper.emitted('insert') as string[][]
    expect(emitted.at(-1)![0]).not.toMatch(/data:/)
  })

  it('shows the empty state when there are no images (non-demo)', async () => {
    const wrapper = await mountSuspended(BodyImagesField)
    expect(wrapper.find('[data-test="body-images-empty"]').exists()).toBe(true)
  })
})
