// tests/nuxt/media-field.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
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
mockNuxtImport('useUpload', () => () => ({
  upload: vi.fn().mockResolvedValue(picked),
  uploadDocument: vi.fn().mockResolvedValue(pickedDoc),
  browse: vi.fn().mockResolvedValue([picked]),
  remove: vi.fn(),
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
  })
})
