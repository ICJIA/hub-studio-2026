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
const uploadMock = vi.fn().mockResolvedValue(uploaded)          // now = uploadImage
const uploadDocumentMock = vi.fn().mockResolvedValue(uploadedDoc)
const updateInfoMock = vi.fn()
const listMock = vi.fn().mockResolvedValue([])

mockNuxtImport('useUpload', () => () => ({
  upload: vi.fn(),
  uploadDocument: uploadDocumentMock,
  browse: vi.fn(),
  remove: vi.fn(),
}))
mockNuxtImport('useMediaLibrary', () => () => ({
  list: listMock,
  uploadImage: uploadMock,
  updateInfo: updateInfoMock,
}))

import MediaPicker from '~/components/MediaPicker.vue'

describe('MediaPicker', () => {
  beforeEach(() => {
    uploadMock.mockClear()
    uploadDocumentMock.mockClear()
    updateInfoMock.mockReset()
    listMock.mockClear()
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
    wrapper.vm.$.exposed!.__tab.value = 'upload'
    await wrapper.vm.$nextTick()
    const input = wrapper.find('input[type="file"]')
    expect(input.exists()).toBe(true)
    // Must be hidden from assistive tech and visually (sr-only class or aria-hidden).
    const classes = input.classes()
    const ariaHidden = input.attributes('aria-hidden')
    expect(classes.includes('sr-only') || ariaHidden === 'true').toBe(true)
  })

  describe('kind="image" (default)', () => {
    it('renders alt text and caption fields', async () => {
      const wrapper = await mountSuspended(MediaPicker, { props: { kind: 'image' } })
      wrapper.vm.$.exposed!.__tab.value = 'upload'
      await wrapper.vm.$nextTick()
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

describe('Library tab (kind="image")', () => {
  const withAlt: MediaRef = {
    id: 7, url: '/uploads/photo.jpg', name: 'photo.jpg',
    alternativeText: 'A good photo', caption: null, width: null, height: null, mime: 'image/jpeg',
  }
  const withoutAlt: MediaRef = { ...withAlt, id: 8, name: 'bare.jpg', alternativeText: null }

  it('defaults to the Library tab for images; Upload tab is one click away', async () => {
    const wrapper = await mountSuspended(MediaPicker)
    expect(wrapper.find('[data-test="library-panel"]').exists()).toBe(true)
    expect(wrapper.find('input[type="file"]').exists()).toBe(false)
    await wrapper.find('[data-test="tab-upload"]').trigger('click')
    expect(wrapper.find('input[type="file"]').exists()).toBe(true)
  })

  it('kind="file" renders NO tabs — upload-only as before', async () => {
    const wrapper = await mountSuspended(MediaPicker, { props: { kind: 'file' } })
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
    expect(wrapper.find('input[type="file"]').exists()).toBe(true)
  })

  it('picking a library image WITH alt emits select immediately — no write-back', async () => {
    const wrapper = await mountSuspended(MediaPicker)
    await wrapper.vm.$.exposed!.__onLibrarySelect(withAlt)
    await wrapper.vm.$.exposed!.__usePicked()
    await new Promise((r) => setTimeout(r, 0))
    expect(updateInfoMock).not.toHaveBeenCalled()
    const ref = wrapper.emitted('select')![0]![0] as MediaRef
    expect(ref.id).toBe(7)
  })

  it('picking a library image WITHOUT alt gates on alt, then writes it back', async () => {
    updateInfoMock.mockResolvedValue({ ...withoutAlt, alternativeText: 'Typed alt' })
    const wrapper = await mountSuspended(MediaPicker)
    await wrapper.vm.$.exposed!.__onLibrarySelect(withoutAlt)

    // No alt yet → gated (no emit, no write).
    await wrapper.vm.$.exposed!.__usePicked()
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(updateInfoMock).not.toHaveBeenCalled()

    // Type alt → write-back runs and select carries the UPDATED ref.
    wrapper.vm.$.exposed!.__pickedAlt.value = 'Typed alt'
    await wrapper.vm.$.exposed!.__usePicked()
    await new Promise((r) => setTimeout(r, 0))
    expect(updateInfoMock).toHaveBeenCalledWith(8, { alternativeText: 'Typed alt' })
    const ref = wrapper.emitted('select')![0]![0] as MediaRef
    expect(ref.alternativeText).toBe('Typed alt')
  })

  it('a failed write-back keeps the pick open and shows a plain-language error', async () => {
    updateInfoMock.mockRejectedValue(new Error('403'))
    const wrapper = await mountSuspended(MediaPicker)
    await wrapper.vm.$.exposed!.__onLibrarySelect(withoutAlt)
    wrapper.vm.$.exposed!.__pickedAlt.value = 'Typed alt'
    await wrapper.vm.$.exposed!.__usePicked()
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(wrapper.vm.$.exposed!.__pickError.value).toMatch(/could not save/i)
  })
})
