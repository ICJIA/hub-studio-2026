// tests/nuxt/media-field.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { MediaRef } from '~/types/content'

// MediaField wraps MediaPicker, which calls useUpload — mock it so no network is hit.
const picked: MediaRef = {
  id: 10, url: '/uploads/splash_abc.png', name: 'splash.png',
  alternativeText: 'Splash alt', caption: null, width: 1200, height: 630, mime: 'image/png',
}
const pickedDoc: MediaRef = {
  id: 20, url: '/uploads/data_xyz.pdf', name: 'data.pdf',
  alternativeText: null, caption: null, width: null, height: null, mime: 'application/pdf',
}
const uploadMock = vi.fn().mockResolvedValue(picked)
const updateInfoMock = vi.fn().mockResolvedValue(null)

mockNuxtImport('useUpload', () => () => ({
  upload: uploadMock,
  uploadDocument: vi.fn().mockResolvedValue(pickedDoc),
  browse: vi.fn().mockResolvedValue([picked]),
  remove: vi.fn(),
}))
mockNuxtImport('useMediaLibrary', () => () => ({
  list: vi.fn().mockResolvedValue([]),
  uploadImage: uploadMock,       // the file's existing image-upload mock
  updateInfo: updateInfoMock,
}))
// Selection toast (manager-visible confirmation that the pick landed).
const toastAdd = vi.fn()
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

import MediaField from '~/components/fields/MediaField.vue'

/** A promise whose resolution is controlled externally — for exercising in-flight request races. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

describe('MediaField', () => {
  it('emits a url-based MediaRef when MediaPicker selects (never data:)', async () => {
    const wrapper = await mountSuspended(MediaField, { props: { modelValue: null, label: 'Splash' } })
    // Drive the wrapped MediaPicker's select via its exposed upload path.
    const picker = wrapper.findComponent({ name: 'MediaPicker' })
    picker.vm.$.exposed!.setFile(new File(['x'], 'splash.png', { type: 'image/png' }))
    picker.vm.$.exposed!.setAlt('Splash alt')
    await picker.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))

    const ref = wrapper.emitted('update:modelValue')!.at(-1)![0] as MediaRef
    expect(ref.id).toBe(10)
    expect(ref.url.startsWith('data:')).toBe(false)
  })

  it('clears the selection back to null', async () => {
    const wrapper = await mountSuspended(MediaField, { props: { modelValue: picked, label: 'Splash' } })
    await wrapper.vm.$.exposed!.clear()
    expect(wrapper.emitted('update:modelValue')!.at(-1)![0]).toBeNull()
  })

  describe('selection notification (a manager-visible confirmation the pick landed)', () => {
    beforeEach(() => { toastAdd.mockClear() })

    it('toasts "«label» selected" with save-then-preview guidance when a new image is selected', async () => {
      const wrapper = await mountSuspended(MediaField, { props: { modelValue: null, label: 'Splash image' } })
      const picker = wrapper.findComponent({ name: 'MediaPicker' })
      picker.vm.$.exposed!.setFile(new File(['x'], 'splash.png', { type: 'image/png' }))
      picker.vm.$.exposed!.setAlt('Splash alt')
      await picker.vm.$.exposed!.submit()
      await new Promise((r) => setTimeout(r, 0))

      expect(toastAdd).toHaveBeenCalledTimes(1)
      const toast = toastAdd.mock.calls[0]![0] as { title: string; description?: string }
      expect(toast.title).toBe('Splash image selected')
      expect(toast.description).toMatch(/[Ss]ave the draft/)
      expect(toast.description).toMatch(/Live preview/)
    })

    it('does NOT toast when the selection is removed', async () => {
      const wrapper = await mountSuspended(MediaField, { props: { modelValue: picked, label: 'Splash image' } })
      await wrapper.vm.$.exposed!.clear()
      expect(toastAdd).not.toHaveBeenCalled()
    })
  })

  describe('selected state when modelValue is set', () => {
    it('shows the file name when a MediaRef is already selected', async () => {
      const wrapper = await mountSuspended(MediaField, { props: { modelValue: picked, label: 'Splash' } })
      expect(wrapper.html()).toContain('splash.png')
    })

    it('shows Replace and Remove buttons when a MediaRef is selected', async () => {
      const wrapper = await mountSuspended(MediaField, { props: { modelValue: picked, label: 'Splash' } })
      expect(wrapper.html()).toContain('Replace')
      expect(wrapper.html()).toContain('Remove')
    })

    it('shows the picker again after clicking Replace', async () => {
      const wrapper = await mountSuspended(MediaField, { props: { modelValue: picked, label: 'Splash' } })
      // Before replace: picker should be hidden (media is selected).
      const pickerBefore = wrapper.findComponent({ name: 'MediaPicker' })
      expect(pickerBefore.exists()).toBe(false)
      // Click Replace.
      const replaceBtn = wrapper.findAll('button').find((b) => b.text().includes('Replace'))
      await replaceBtn!.trigger('click')
      // After replace: picker should appear.
      const pickerAfter = wrapper.findComponent({ name: 'MediaPicker' })
      expect(pickerAfter.exists()).toBe(true)
    })
  })

  describe('selected image — editable alt text and caption (kind="image")', () => {
    it('renders editable alt text and caption inputs when an image MediaRef is selected', async () => {
      const wrapper = await mountSuspended(MediaField, { props: { modelValue: picked, label: 'Splash' } })
      // Alt and caption inputs must be visible in the selected state.
      const inputs = wrapper.findAll('input')
      const altInput = inputs.find((i) => {
        const p = i.attributes('placeholder') ?? ''
        return p.toLowerCase().includes('screen reader') || p.toLowerCase().includes('alt')
      })
      const captionInput = inputs.find((i) => {
        const p = i.attributes('placeholder') ?? ''
        return p.toLowerCase().includes('caption')
      })
      expect(altInput).toBeTruthy()
      expect(captionInput).toBeTruthy()
    })

    it('pre-fills alt text from the MediaRef alternativeText', async () => {
      const wrapper = await mountSuspended(MediaField, { props: { modelValue: picked, label: 'Splash' } })
      const altInput = wrapper.find('[data-test="selected-alt"]')
      expect(altInput.exists()).toBe(true)
      // Check via attributes (model-value binding) or element cast.
      const inputEl = altInput.element as HTMLInputElement
      const displayedValue = inputEl.value ?? altInput.attributes('value') ?? altInput.attributes('model-value') ?? ''
      expect(displayedValue).toContain('Splash alt')
    })

    it('emits an updated MediaRef when alt text is changed', async () => {
      const wrapper = await mountSuspended(MediaField, { props: { modelValue: picked, label: 'Splash' } })
      const altInput = wrapper.find('[data-test="selected-alt"]')
      await altInput.setValue('New alt text')
      await altInput.trigger('input')
      await new Promise((r) => setTimeout(r, 0))
      const events = wrapper.emitted('update:modelValue')
      expect(events).toBeTruthy()
      const emitted = events!.at(-1)![0] as MediaRef
      expect(emitted.alternativeText).toBe('New alt text')
      // Other fields preserved.
      expect(emitted.id).toBe(picked.id)
      expect(emitted.url).toBe(picked.url)
    })

    it('emits an updated MediaRef when caption is changed', async () => {
      const wrapper = await mountSuspended(MediaField, { props: { modelValue: picked, label: 'Splash' } })
      const captionInput = wrapper.find('[data-test="selected-caption"]')
      await captionInput.setValue('A new caption')
      await captionInput.trigger('input')
      await new Promise((r) => setTimeout(r, 0))
      const events = wrapper.emitted('update:modelValue')
      expect(events).toBeTruthy()
      const emitted = events!.at(-1)![0] as MediaRef
      expect(emitted.caption).toBe('A new caption')
      expect(emitted.id).toBe(picked.id)
    })

    it('does NOT show alt/caption inputs for kind="image" when no MediaRef is selected', async () => {
      const wrapper = await mountSuspended(MediaField, { props: { modelValue: null, label: 'Splash' } })
      // When nothing is selected the picker is shown; the alt/caption are INSIDE the picker, not the field.
      // The selected-state inputs (data-test="selected-alt") must NOT appear.
      expect(wrapper.find('[data-test="selected-alt"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="selected-caption"]').exists()).toBe(false)
    })
  })

  describe('kind="file"', () => {
    it('renders no alt input when kind="file"', async () => {
      const wrapper = await mountSuspended(MediaField, { props: { modelValue: null, label: 'Data file', kind: 'file' } })
      // No input with alt/screen-reader placeholder should be present.
      const inputs = wrapper.findAll('input')
      const altInput = inputs.find((i) => {
        const p = i.attributes('placeholder') ?? ''
        return p.toLowerCase().includes('screen reader') || p.toLowerCase().includes('alt')
      })
      expect(altInput).toBeUndefined()
    })

    it('emits a document MediaRef (never data:) when kind="file"', async () => {
      const wrapper = await mountSuspended(MediaField, { props: { modelValue: null, label: 'Data file', kind: 'file' } })
      const picker = wrapper.findComponent({ name: 'MediaPicker' })
      picker.vm.$.exposed!.setFile(new File(['pdf'], 'data.pdf', { type: 'application/pdf' }))
      await picker.vm.$.exposed!.submit()
      await new Promise((r) => setTimeout(r, 0))

      const ref = wrapper.emitted('update:modelValue')!.at(-1)![0] as MediaRef
      expect(ref.id).toBe(20)
      expect(ref.url).toBe('/uploads/data_xyz.pdf')
      expect(ref.url.startsWith('data:')).toBe(false)
    })

    it('shows file name (not thumbnail img) for a selected document', async () => {
      const wrapper = await mountSuspended(MediaField, { props: { modelValue: pickedDoc, label: 'Data file', kind: 'file' } })
      // Should show file name.
      expect(wrapper.html()).toContain('data.pdf')
      // Should NOT show an img thumbnail (it's a doc, not an image).
      expect(wrapper.find('img').exists()).toBe(false)
    })

    it('does NOT render alt or caption inputs for kind="file" even when a doc is selected', async () => {
      const wrapper = await mountSuspended(MediaField, { props: { modelValue: pickedDoc, label: 'Data file', kind: 'file' } })
      expect(wrapper.find('[data-test="selected-alt"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="selected-caption"]').exists()).toBe(false)
    })
  })

  describe('alt/caption persistence (quirk fix)', () => {
    const selected: MediaRef = {
      id: 42, url: '/uploads/pic.jpg', name: 'pic.jpg',
      alternativeText: 'Original alt', caption: 'Original caption',
      width: null, height: null, mime: 'image/jpeg',
    }

    /**
     * Mount with a v-model bridge: emitted update:modelValue is fed back as the prop, mirroring
     * the mountWithModel helper in tests/nuxt/main-files-field.test.ts. MediaField is mounted at
     * the wrapper root here (no parent template driving v-model), and vue-test-utils does not
     * sync root props from emitted events on its own, so __persistInfo (which reads current
     * props) would otherwise never see a post-edit alt/caption.
     */
    async function mountWithModel(initial: MediaRef) {
      const wrapper = await mountSuspended(MediaField, {
        props: {
          modelValue: initial,
          label: 'Main image',
          'onUpdate:modelValue': async (v: MediaRef | null) => {
            await wrapper.setProps({ modelValue: v })
          },
        },
      })
      return wrapper
    }

    // NOTE: `beforeEach(() => updateInfoMock.mockReset())` would be a footgun here — mockReset()
    // returns the mock itself for chaining, and Vitest treats a function RETURNED from beforeEach
    // as an auto-registered post-test cleanup callback. That would silently re-invoke
    // updateInfoMock after every test in this block, which is harmless against a resolved mock
    // but produces a genuine unhandled rejection in the "persistence fails" test below (which
    // configures a rejecting mock). Braces avoid the implicit return.
    beforeEach(() => {
      updateInfoMock.mockReset()
    })

    it('persists changed alt via updateInfo on commit (blur)', async () => {
      updateInfoMock.mockResolvedValue({ ...selected, alternativeText: 'New alt' })
      const wrapper = await mountWithModel(selected)
      await wrapper.find('[data-test="selected-alt"]').setValue('New alt')
      await wrapper.vm.$.exposed!.__persistInfo()
      expect(updateInfoMock).toHaveBeenCalledWith(42, { alternativeText: 'New alt', caption: 'Original caption' })
    })

    it('does NOT call updateInfo when nothing changed', async () => {
      const wrapper = await mountWithModel(selected)
      await wrapper.vm.$.exposed!.__persistInfo()
      expect(updateInfoMock).not.toHaveBeenCalled()
    })

    it('does NOT call updateInfo for display-only refs (id 0)', async () => {
      const wrapper = await mountWithModel({ ...selected, id: 0 })
      await wrapper.find('[data-test="selected-alt"]').setValue('New alt')
      await wrapper.vm.$.exposed!.__persistInfo()
      expect(updateInfoMock).not.toHaveBeenCalled()
    })

    it('never persists an EMPTY alt (the required-field error owns that state)', async () => {
      const wrapper = await mountWithModel(selected)
      await wrapper.find('[data-test="selected-alt"]').setValue('')
      await wrapper.vm.$.exposed!.__persistInfo()
      expect(updateInfoMock).not.toHaveBeenCalled()
    })

    it('shows a field-level error when persistence fails, keeping the local value', async () => {
      updateInfoMock.mockRejectedValue(new Error('403'))
      const wrapper = await mountWithModel(selected)
      await wrapper.find('[data-test="selected-alt"]').setValue('New alt')
      await wrapper.vm.$.exposed!.__persistInfo()
      await new Promise((r) => setTimeout(r, 0))
      expect(wrapper.vm.$.exposed!.__persistError.value).toMatch(/could not save/i)
      expect(wrapper.find('[data-test="persist-error"]').exists()).toBe(true)
      // The title says "keeping the local value" — prove the input still DISPLAYS the unsaved edit.
      const altInput = wrapper.find('[data-test="selected-alt"]').element as HTMLInputElement
      expect(altInput.value).toBe('New alt')
    })

    // Two reachable defects, one root cause: persistInfo() only updates persistedAlt/persistedCaption
    // AFTER the await, with no check that the response still belongs to the media id it was fired for.
    describe('stale-baseline race in the write-back', () => {
      it('alt-blur then immediate caption-blur before call 1 resolves fires updateInfo exactly once', async () => {
        const inFlight = deferred<MediaRef>()
        updateInfoMock.mockReturnValueOnce(inFlight.promise)
        const wrapper = await mountWithModel(selected)
        await wrapper.find('[data-test="selected-alt"]').setValue('New alt')

        // Blur 1 (alt): fires the persist call, leaves it in flight (unresolved).
        const call1 = wrapper.vm.$.exposed!.__persistInfo()
        // Blur 2 (tab straight to caption, no further edit) while call 1 is still unresolved.
        await wrapper.vm.$.exposed!.__persistInfo()

        expect(updateInfoMock).toHaveBeenCalledTimes(1)

        inFlight.resolve({ ...selected, alternativeText: 'New alt' })
        await call1
      })

      it('a stale in-flight response for image A does not stomp a since-replaced image B\'s baselines', async () => {
        const imageB: MediaRef = {
          id: 99, url: '/uploads/other.jpg', name: 'other.jpg',
          alternativeText: 'B alt', caption: 'B caption',
          width: null, height: null, mime: 'image/jpeg',
        }
        const inFlightA = deferred<MediaRef>()
        updateInfoMock.mockReturnValueOnce(inFlightA.promise)

        const wrapper = await mountWithModel(selected) // image A, id 42
        await wrapper.find('[data-test="selected-alt"]').setValue('New alt A')
        const callA = wrapper.vm.$.exposed!.__persistInfo() // fires, left in flight

        // Replace with image B before A's call resolves — reseeds baselines to B's own values.
        await wrapper.setProps({ modelValue: imageB })

        // A's late response finally resolves. It must be ignored: B is now current.
        inFlightA.resolve({ ...selected, alternativeText: 'New alt A' })
        await callA
        await new Promise((r) => setTimeout(r, 0))

        // A no-edit blur on B is a no-op ONLY if B's baseline is still B's own (untouched by A).
        await wrapper.vm.$.exposed!.__persistInfo()
        expect(updateInfoMock).toHaveBeenCalledTimes(1) // A's original call only — no spurious B call
      })

      it('after a failed persist, blurring again retries because the baseline was restored', async () => {
        updateInfoMock.mockRejectedValueOnce(new Error('403'))
        const wrapper = await mountWithModel(selected)
        await wrapper.find('[data-test="selected-alt"]').setValue('New alt')
        await wrapper.vm.$.exposed!.__persistInfo()
        await new Promise((r) => setTimeout(r, 0))
        expect(updateInfoMock).toHaveBeenCalledTimes(1)
        expect(wrapper.vm.$.exposed!.__persistError.value).toMatch(/could not save/i)

        updateInfoMock.mockResolvedValueOnce({ ...selected, alternativeText: 'New alt' })
        await wrapper.vm.$.exposed!.__persistInfo() // retry — still-unsaved value, no further edit
        expect(updateInfoMock).toHaveBeenCalledTimes(2)
        expect(updateInfoMock).toHaveBeenLastCalledWith(42, { alternativeText: 'New alt', caption: 'Original caption' })
      })
    })

    // Residual race found in re-review: the id guard alone protects against a REPLACE (id
    // change) but not against two overlapping calls on the SAME id resolving out of order —
    // the older call's late response still passes the id check and clobbers the newer call's
    // already-applied baseline (or paints a stale error over an edit that already succeeded).
    describe('same-id overlapping persist calls (out-of-order responses)', () => {
      it('call 2 resolving before call 1 keeps call 2\'s baseline; call 1\'s late response is ignored entirely', async () => {
        const call1 = deferred<MediaRef>()
        const call2 = deferred<MediaRef>()
        updateInfoMock.mockReturnValueOnce(call1.promise)
        updateInfoMock.mockReturnValueOnce(call2.promise)

        const wrapper = await mountWithModel(selected) // id 42
        await wrapper.find('[data-test="selected-alt"]').setValue('V1')
        const p1 = wrapper.vm.$.exposed!.__persistInfo() // call 1: fires, in flight (slow)

        await wrapper.find('[data-test="selected-alt"]').setValue('V2')
        const p2 = wrapper.vm.$.exposed!.__persistInfo() // call 2: fires, in flight (same id)

        expect(updateInfoMock).toHaveBeenCalledTimes(2)

        // Call 2 (the newer edit) resolves FIRST and applies its baseline.
        call2.resolve({ ...selected, alternativeText: 'V2' })
        await p2
        await new Promise((r) => setTimeout(r, 0))

        // Call 1 (the older, slower edit) resolves LATE, same id — must be ignored entirely.
        call1.resolve({ ...selected, alternativeText: 'V1' })
        await p1
        await new Promise((r) => setTimeout(r, 0))

        // Baseline must still reflect V2: a no-edit blur (current is still 'V2') fires nothing.
        updateInfoMock.mockClear()
        await wrapper.vm.$.exposed!.__persistInfo()
        expect(updateInfoMock).not.toHaveBeenCalled()
      })

      it('call 1 failing AFTER call 2 already succeeded does not paint a stale error', async () => {
        const call1 = deferred<MediaRef>()
        const call2 = deferred<MediaRef>()
        updateInfoMock.mockReturnValueOnce(call1.promise)
        updateInfoMock.mockReturnValueOnce(call2.promise)

        const wrapper = await mountWithModel(selected) // id 42
        await wrapper.find('[data-test="selected-alt"]').setValue('V1')
        const p1 = wrapper.vm.$.exposed!.__persistInfo() // call 1: fires, in flight (slow)

        await wrapper.find('[data-test="selected-alt"]').setValue('V2')
        const p2 = wrapper.vm.$.exposed!.__persistInfo() // call 2: fires, in flight (same id)

        // Call 2 succeeds first.
        call2.resolve({ ...selected, alternativeText: 'V2' })
        await p2
        await new Promise((r) => setTimeout(r, 0))
        expect(wrapper.vm.$.exposed!.__persistError.value).toBeNull()

        // Call 1 rejects LATE, after call 2 already succeeded — must not paint an error over
        // an edit that ultimately succeeded, nor touch the now-correct V2 baseline.
        call1.reject(new Error('403'))
        await p1
        await new Promise((r) => setTimeout(r, 0))

        expect(wrapper.vm.$.exposed!.__persistError.value).toBeNull()
        expect(wrapper.find('[data-test="persist-error"]').exists()).toBe(false)
      })
    })

    describe('baseline reseed on Replace', () => {
      it('replacing after a failed persist on A clears persistError and reseeds baselines for B', async () => {
        updateInfoMock.mockRejectedValueOnce(new Error('403'))
        const wrapper = await mountWithModel(selected) // image A, id 42
        await wrapper.find('[data-test="selected-alt"]').setValue('New alt')
        await wrapper.vm.$.exposed!.__persistInfo()
        await new Promise((r) => setTimeout(r, 0))
        expect(wrapper.vm.$.exposed!.__persistError.value).toBeTruthy()

        const imageB: MediaRef = {
          id: 99, url: '/uploads/other.jpg', name: 'other.jpg',
          alternativeText: 'B alt', caption: 'B caption',
          width: null, height: null, mime: 'image/jpeg',
        }
        await wrapper.setProps({ modelValue: imageB })
        expect(wrapper.vm.$.exposed!.__persistError.value).toBeNull()

        updateInfoMock.mockClear()
        await wrapper.vm.$.exposed!.__persistInfo() // no edit on B — must be a no-op
        expect(updateInfoMock).not.toHaveBeenCalled()
      })
    })

    // All the tests above drive persistence via __persistInfo() directly, so deleting
    // @blur="persistInfo" from the template would fail nothing. These close that gap by
    // triggering a real native blur event through the rendered input.
    describe('@blur wiring (regression net)', () => {
      it('blurring the alt input (native event) triggers updateInfo', async () => {
        updateInfoMock.mockResolvedValueOnce({ ...selected, alternativeText: 'New alt' })
        const wrapper = await mountWithModel(selected)
        const altInput = wrapper.find('[data-test="selected-alt"]')
        await altInput.setValue('New alt')
        await altInput.trigger('blur')
        expect(updateInfoMock).toHaveBeenCalled()
      })

      it('blurring the caption input (native event) triggers updateInfo', async () => {
        updateInfoMock.mockResolvedValueOnce({ ...selected, caption: 'New caption' })
        const wrapper = await mountWithModel(selected)
        const captionInput = wrapper.find('[data-test="selected-caption"]')
        await captionInput.setValue('New caption')
        await captionInput.trigger('blur')
        expect(updateInfoMock).toHaveBeenCalled()
      })
    })
  })
})
