// tests/nuxt/markdown-editor.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { MediaRef } from '~/types/content'

const uploaded: MediaRef = {
  id: 7, url: '/uploads/pasted_xyz.png', name: 'pasted.png',
  alternativeText: 'Pasted image', caption: null, width: 64, height: 64, mime: 'image/png',
}
const uploadMock = vi.fn().mockResolvedValue(uploaded)
mockNuxtImport('useUpload', () => () => ({ upload: uploadMock, browse: vi.fn().mockResolvedValue([]), remove: vi.fn() }))

import MarkdownEditor from '~/components/MarkdownEditor.vue'

describe('MarkdownEditor (CM6 shell; the MarkdownField seam)', () => {
  it('renders the mount target and shows modelValue in the kept MarkdownPreview', async () => {
    const wrapper = await mountSuspended(MarkdownEditor, { props: { modelValue: '# Hello', label: 'Body' } })
    // Our renderer preview is kept beside the editor.
    expect(wrapper.find('.prose-preview').html()).toMatch(/<h1[^>]*>Hello<\/h1>/)
    // The editor owns a mount-target element (CM mounts here in onMounted).
    expect(wrapper.find('[data-test="cm-host"]').exists()).toBe(true)
  })

  it('honors the v-model seam: an onChange-driven document edit emits update:modelValue', async () => {
    const wrapper = await mountSuspended(MarkdownEditor, { props: { modelValue: '', label: 'Body' } })
    // Drive the adapter via the exposed onChange hook (stable regardless of EditorView mountability).
    // The component exposes `__emitChange` for tests; it routes through the same emit path as CM's onChange.
    wrapper.vm.$.exposed!.__emitChange('## Edited')
    await new Promise((r) => setTimeout(r, 0))
    const events = wrapper.emitted('update:modelValue')
    expect(events).toBeTruthy()
    expect(events!.at(-1)![0]).toBe('## Edited')
  })

  it('routes dropped/pasted image files through useUpload and inserts a url-based snippet (never data:)', async () => {
    const wrapper = await mountSuspended(MarkdownEditor, { props: { modelValue: '', label: 'Body' } })
    const inserted: string[] = []
    // The component exposes `__handleFiles` (wraps handleImageFiles with the live upload + insert closures);
    // we capture the inserted markdown via the exposed `__lastInsert` ref for assertion.
    await wrapper.vm.$.exposed!.__handleFiles([new File(['x'], 'snap.png', { type: 'image/png' })], (s: string) => inserted.push(s))
    await new Promise((r) => setTimeout(r, 0))
    expect(uploadMock).toHaveBeenCalled()
    expect(inserted[0]).toMatch(/\/uploads\//)
    expect(inserted[0]).not.toMatch(/data:/)
  })
})
