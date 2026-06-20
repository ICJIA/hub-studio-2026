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
mockNuxtImport('useUpload', () => () => ({
  upload: vi.fn().mockResolvedValue(picked),
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
})
