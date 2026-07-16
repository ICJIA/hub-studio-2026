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

import MediaField from '~/components/fields/MediaField.vue'

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
    })
  })
})
