// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { MediaRef } from '~/types/content'

const uploaded: MediaRef = {
  id: 42, url: '/uploads/figure_abc123.png', name: 'figure.png',
  alternativeText: 'Bar chart', caption: null, width: 800, height: 600, mime: 'image/png',
}
const uploadedDoc: MediaRef = {
  id: 99, url: '/uploads/report_xyz.pdf', name: 'report.pdf',
  alternativeText: null, caption: null, width: null, height: null, mime: 'application/pdf',
}
const uploadMock = vi.fn().mockResolvedValue(uploaded)
const uploadDocumentMock = vi.fn().mockResolvedValue(uploadedDoc)
const browseMock = vi.fn().mockResolvedValue([uploaded])

mockNuxtImport('useUpload', () => () => ({
  upload: uploadMock,
  uploadDocument: uploadDocumentMock,
  browse: browseMock,
  remove: vi.fn(),
}))

import MediaPicker from '~/components/MediaPicker.vue'

describe('MediaPicker', () => {
  beforeEach(() => {
    uploadMock.mockClear()
    uploadDocumentMock.mockClear()
    browseMock.mockClear()
  })

  it('blocks image upload until alt-text is provided (kind="image", default)', async () => {
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
    const ref = events![0]![0] as MediaRef
    expect(ref.url).toBe('/uploads/figure_abc123.png')
    expect(ref.url.startsWith('data:')).toBe(false)
  })

  it('native file input is hidden (sr-only / aria-hidden) — "No file chosen" is never visible', async () => {
    const wrapper = await mountSuspended(MediaPicker)
    const input = wrapper.find('input[type="file"]')
    expect(input.exists()).toBe(true)
    // Must be hidden from assistive tech and visually (sr-only class or aria-hidden).
    const classes = input.classes()
    const ariaHidden = input.attributes('aria-hidden')
    expect(classes.includes('sr-only') || ariaHidden === 'true').toBe(true)
  })

  it('in browse mode, selecting a tile emits its (url-based) MediaRef', async () => {
    const wrapper = await mountSuspended(MediaPicker, { props: { mode: 'browse' } })
    await new Promise((r) => setTimeout(r, 0))
    expect(browseMock).toHaveBeenCalled()
    await wrapper.vm.$.exposed!.choose(uploaded)
    const ref = wrapper.emitted('select')![0]![0] as MediaRef
    expect(ref.url.startsWith('data:')).toBe(false)
    expect(ref.id).toBe(42)
  })

  describe('kind="image" (default)', () => {
    it('renders alt text and caption fields', async () => {
      const wrapper = await mountSuspended(MediaPicker, { props: { kind: 'image' } })
      // Alt and caption inputs should be present (identified by placeholder text).
      const inputs = wrapper.findAll('input[type="text"], input:not([type]), input[type="search"]')
      const placeholders = inputs.map((i) => i.attributes('placeholder') ?? '')
      const hasAlt = placeholders.some((p) => p.toLowerCase().includes('screen reader') || p.toLowerCase().includes('alt'))
      const hasCaption = placeholders.some((p) => p.toLowerCase().includes('caption'))
      expect(hasAlt).toBe(true)
      expect(hasCaption).toBe(true)
    })
  })

  describe('kind="file"', () => {
    it('does NOT render alt text or caption fields', async () => {
      const wrapper = await mountSuspended(MediaPicker, { props: { kind: 'file' } })
      // No text inputs should have alt/caption placeholder text.
      const inputs = wrapper.findAll('input')
      const altInput = inputs.find((i) => {
        const p = i.attributes('placeholder') ?? ''
        return p.toLowerCase().includes('screen reader') || p.toLowerCase().includes('alt')
      })
      const captionInput = inputs.find((i) => {
        const p = i.attributes('placeholder') ?? ''
        return p.toLowerCase().includes('caption')
      })
      expect(altInput).toBeUndefined()
      expect(captionInput).toBeUndefined()
    })

    it('does NOT render an alt input element', async () => {
      const wrapper = await mountSuspended(MediaPicker, { props: { kind: 'file' } })
      // The hidden file input is present, but no text input for alt should exist.
      const inputs = wrapper.findAll('input')
      const altInput = inputs.find((i) =>
        i.attributes('placeholder')?.toLowerCase().includes('alt')
        || i.attributes('placeholder')?.toLowerCase().includes('screen reader'),
      )
      expect(altInput).toBeUndefined()
    })

    it('uploads with uploadDocument (not upload) when kind="file"', async () => {
      const wrapper = await mountSuspended(MediaPicker, { props: { kind: 'file' } })
      const file = new File(['pdf content'], 'report.pdf', { type: 'application/pdf' })
      await wrapper.vm.$.exposed!.setFile(file)
      await wrapper.vm.$.exposed!.submit()
      await new Promise((r) => setTimeout(r, 0))
      expect(uploadDocumentMock).toHaveBeenCalledWith(file)
      expect(uploadMock).not.toHaveBeenCalled()
    })

    it('emits select with a Media-Library URL (never data:) for a document', async () => {
      const wrapper = await mountSuspended(MediaPicker, { props: { kind: 'file' } })
      const file = new File(['pdf content'], 'report.pdf', { type: 'application/pdf' })
      await wrapper.vm.$.exposed!.setFile(file)
      await wrapper.vm.$.exposed!.submit()
      await new Promise((r) => setTimeout(r, 0))
      const events = wrapper.emitted('select')
      expect(events).toBeTruthy()
      const ref = events![0]![0] as MediaRef
      expect(ref.url).toBe('/uploads/report_xyz.pdf')
      expect(ref.url.startsWith('data:')).toBe(false)
    })

    it('does NOT gate on alt text for kind="file" — submit succeeds without alt', async () => {
      const wrapper = await mountSuspended(MediaPicker, { props: { kind: 'file' } })
      const file = new File(['pdf content'], 'report.pdf', { type: 'application/pdf' })
      await wrapper.vm.$.exposed!.setFile(file)
      // Deliberately do NOT call setAlt — should still submit.
      await wrapper.vm.$.exposed!.submit()
      await new Promise((r) => setTimeout(r, 0))
      expect(uploadDocumentMock).toHaveBeenCalledWith(file)
    })
  })
})
