// tests/nuxt/markdown-field.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'

// MarkdownField now wraps MarkdownEditor → MarkdownEditor uses useUpload; stub it so mounting hits no network.
mockNuxtImport('useUpload', () => () => ({ upload: vi.fn(), browse: vi.fn().mockResolvedValue([]), remove: vi.fn() }))

import MarkdownField from '~/components/MarkdownField.vue'

describe('MarkdownField (now the ICJIA editor seam)', () => {
  it('renders the bound value in the live preview when toggled on (our renderer)', async () => {
    const wrapper = await mountSuspended(MarkdownField, { props: { modelValue: '# Hello', label: 'Body' } })
    // Preview is opt-in; turning it on renders our markdown-it preview with the bound value.
    await wrapper.find('[data-test="preview-toggle"]').trigger('click')
    expect(wrapper.find('.prose-preview').html()).toMatch(/<h1[^>]*>Hello<\/h1>/)
  })

  it('emits update:modelValue through the editor change path (contract preserved)', async () => {
    const wrapper = await mountSuspended(MarkdownField, { props: { modelValue: '', label: 'Body' } })
    // Reach the inner MarkdownEditor's stable change hook (routes through CM onChange in the browser).
    const editor = wrapper.findComponent({ name: 'MarkdownEditor' })
    editor.vm.$.exposed!.__emitChange('## Edited')
    await new Promise((r) => setTimeout(r, 0))
    const events = wrapper.emitted('update:modelValue')
    expect(events).toBeTruthy()
    expect(events!.at(-1)![0]).toBe('## Edited')
  })
})
