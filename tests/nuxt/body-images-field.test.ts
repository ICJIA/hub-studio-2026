// tests/nuxt/body-images-field.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { MediaRef } from '~/types/content'

const uploaded: MediaRef = {
  id: 9, url: '/uploads/figure_abc.png', name: 'figure.png',
  alternativeText: 'A chart', caption: null, width: 64, height: 64, mime: 'image/png',
}
// Keep the pre-existing uploadMock's resolved value — the upload-path tests below drive
// __handleFiles, which now calls useMediaLibrary().uploadImage instead of useUpload().upload.
const uploadMock = vi.fn().mockResolvedValue(uploaded)
const updateInfoMock = vi.fn()
mockNuxtImport('useUpload', () => () => ({ upload: vi.fn(), uploadDocument: vi.fn(), browse: vi.fn(), remove: vi.fn() }))
mockNuxtImport('useMediaLibrary', () => () => ({
  list: vi.fn().mockResolvedValue([]),
  uploadImage: uploadMock,
  updateInfo: updateInfoMock,
}))

import BodyImagesField from '~/components/forms/BodyImagesField.vue'

/** A promise whose resolution is controlled externally — for exercising in-flight request races. */
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

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
})

describe('Add from library', () => {
  const libWithAlt: MediaRef = {
    id: -3, url: '/images/demo/photo.jpg', name: 'photo.jpg',
    alternativeText: 'Library photo', caption: 'Lib caption', width: null, height: null, mime: 'image/jpeg',
  }
  const libNoAlt: MediaRef = { ...libWithAlt, id: -4, name: 'bare.jpg', alternativeText: null, caption: null }

  // NOTE: `beforeEach(() => updateInfoMock.mockReset())` would be a footgun here — mockReset()
  // returns the mock itself for chaining, and Vitest treats a function RETURNED from beforeEach
  // as an auto-registered post-test cleanup callback. That would silently re-invoke updateInfoMock
  // after every test in this block, harmless against a resolved mock but a genuine unhandled
  // rejection in the "failed write-back" test below (which configures a rejecting mock). Braces
  // avoid the implicit return (same fix as media-field.test.ts's identical NOTE).
  beforeEach(() => {
    updateInfoMock.mockReset()
  })

  it('does NOT auto-seed the tray anymore (empty on mount, demo or not)', async () => {
    const wrapper = await mountSuspended(BodyImagesField)
    expect(wrapper.find('[data-test="body-images-empty"]').exists()).toBe(true)
  })

  it('renders an Add from library toggle that reveals the grid', async () => {
    const wrapper = await mountSuspended(BodyImagesField)
    expect(wrapper.find('[data-test="library-in-tray"]').exists()).toBe(false)
    await wrapper.find('[data-test="add-from-library"]').trigger('click')
    expect(wrapper.find('[data-test="library-in-tray"]').exists()).toBe(true)
  })

  it('a picked image WITH alt joins the tray seeded with the library alt/caption', async () => {
    const wrapper = await mountSuspended(BodyImagesField)
    await wrapper.vm.$.exposed!.__onLibraryPick(libWithAlt)
    const tray = wrapper.vm.$.exposed!.__trayImages.value
    expect(tray).toHaveLength(1)
    expect(tray[0]!.alt).toBe('Library photo')
    expect(tray[0]!.caption).toBe('Lib caption')
    expect(updateInfoMock).not.toHaveBeenCalled()
  })

  it('a picked image WITHOUT alt gates on alt, writes it back, then joins the tray', async () => {
    updateInfoMock.mockResolvedValue({ ...libNoAlt, alternativeText: 'Typed alt' })
    const wrapper = await mountSuspended(BodyImagesField)
    await wrapper.vm.$.exposed!.__onLibraryPick(libNoAlt)
    expect(wrapper.vm.$.exposed!.__trayImages.value).toHaveLength(0)
    expect(wrapper.vm.$.exposed!.__pendingPick.value?.id).toBe(-4)

    // Confirm without alt → no-op.
    await wrapper.vm.$.exposed!.__confirmPendingPick()
    expect(updateInfoMock).not.toHaveBeenCalled()

    // Type alt → write-back + tray add with the updated alt.
    wrapper.vm.$.exposed!.__pendingAlt.value = 'Typed alt'
    await wrapper.vm.$.exposed!.__confirmPendingPick()
    await new Promise((r) => setTimeout(r, 0))
    expect(updateInfoMock).toHaveBeenCalledWith(-4, { alternativeText: 'Typed alt', caption: '' })
    const tray = wrapper.vm.$.exposed!.__trayImages.value
    expect(tray).toHaveLength(1)
    expect(tray[0]!.alt).toBe('Typed alt')
  })

  it('a failed write-back shows an error and does not add to the tray', async () => {
    updateInfoMock.mockRejectedValue(new Error('403'))
    const wrapper = await mountSuspended(BodyImagesField)
    await wrapper.vm.$.exposed!.__onLibraryPick(libNoAlt)
    wrapper.vm.$.exposed!.__pendingAlt.value = 'Typed alt'
    await wrapper.vm.$.exposed!.__confirmPendingPick()
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.vm.$.exposed!.__trayImages.value).toHaveLength(0)
    expect(wrapper.vm.$.exposed!.__pickError.value).toMatch(/could not save/i)
  })

  // Same race class the reviewers flagged in MediaPicker (Task 6, pickBusy-gated `canUsePicked`)
  // and hardened in MediaField (Task 7, out-of-order-response guards): a second confirm fired
  // while the first write-back is still in flight must NOT fire a second updateInfo call.
  it('a second confirm click while the first is still in flight does not fire a duplicate write-back', async () => {
    const gate = deferred<MediaRef>()
    updateInfoMock.mockReturnValue(gate.promise)
    const wrapper = await mountSuspended(BodyImagesField)
    await wrapper.vm.$.exposed!.__onLibraryPick(libNoAlt)
    wrapper.vm.$.exposed!.__pendingAlt.value = 'Typed alt'

    const first = wrapper.vm.$.exposed!.__confirmPendingPick()
    await wrapper.vm.$.exposed!.__confirmPendingPick() // second call while call 1 is still in flight
    expect(updateInfoMock).toHaveBeenCalledTimes(1)

    gate.resolve({ ...libNoAlt, alternativeText: 'Typed alt' })
    await first
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.vm.$.exposed!.__trayImages.value).toHaveLength(1)
  })
})
