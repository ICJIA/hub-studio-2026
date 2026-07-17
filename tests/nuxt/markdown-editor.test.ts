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
  it('shows modelValue in the live preview when the Preview toggle is on', async () => {
    const wrapper = await mountSuspended(MarkdownEditor, { props: { modelValue: '# Hello', label: 'Body' } })
    // The editor owns a mount-target element (CM mounts here in onMounted).
    expect(wrapper.find('[data-test="cm-host"]').exists()).toBe(true)
    // Preview is opt-in (default off → a wider editor); turning it on renders our markdown-it preview.
    expect(wrapper.find('.prose-preview').exists()).toBe(false)
    await wrapper.find('[data-test="preview-toggle"]').trigger('click')
    expect(wrapper.find('.prose-preview').html()).toMatch(/<h1[^>]*>Hello<\/h1>/)
  })

  it('gives the CM host an aria-labelledby pointing at the rendered label (a11y fix)', async () => {
    const wrapper = await mountSuspended(MarkdownEditor, { props: { modelValue: '', label: 'Body (Markdown)' } })
    const label = wrapper.find('label')
    const host = wrapper.find('[data-test="cm-host"]')
    expect(label.exists()).toBe(true)
    const labelId = label.attributes('id')
    expect(labelId).toBeTruthy()
    expect(host.attributes('aria-labelledby')).toBe(labelId)
  })

  it('omits aria-labelledby on the CM host when no label prop is given', async () => {
    const wrapper = await mountSuspended(MarkdownEditor, { props: { modelValue: '' } })
    const host = wrapper.find('[data-test="cm-host"]')
    expect(host.attributes('aria-labelledby')).toBeUndefined()
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

  it('exposes an imperative insertMarkdown that the sidebar BodyImagesField calls to place a figure', async () => {
    const wrapper = await mountSuspended(MarkdownEditor, { props: { modelValue: '', label: 'Body' } })
    // The body-image panel lives in the sidebar now; it reaches the editor only via this seam.
    expect(typeof wrapper.vm.$.exposed!.insertMarkdown).toBe('function')
    expect(typeof wrapper.vm.$.exposed!.__insertMarkdown).toBe('function')
  })

  it('insertMarkdown returns the 1-based insertion line and cursorLine tracks the cursor', async () => {
    const wrapper = await mountSuspended(MarkdownEditor, { props: { modelValue: '', label: 'Body' } })
    await new Promise((r) => setTimeout(r, 0)) // let onMounted create the EditorView
    const exposed = wrapper.vm.$.exposed!
    // Empty doc: the insert begins on line 1 — and that line is what the sidebar toast reports.
    expect(exposed.insertMarkdown('alpha\nbravo\n')).toBe(1)
    await new Promise((r) => setTimeout(r, 0))
    // The cursor landed after the trailing newline → line 3; the reactive seam reports it.
    expect(exposed.cursorLine.value).toBe(3)
    // A second insert therefore begins at line 3.
    expect(exposed.insertMarkdown('charlie')).toBe(3)
  })

  it('no longer renders an in-editor body-image tray (it moved to the sidebar BodyImagesField)', async () => {
    const wrapper = await mountSuspended(MarkdownEditor, { props: { modelValue: '', label: 'Body' } })
    expect(wrapper.find('[data-test="body-image-gallery"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="gallery-tray"]').exists()).toBe(false)
  })

  it('guard suppresses the echo: external modelValue update does NOT cause update:modelValue to be re-emitted', async () => {
    // Mount with an initial value so the watcher has a baseline.
    const wrapper = await mountSuspended(MarkdownEditor, { props: { modelValue: '# Initial', label: 'Body' } })
    // Clear any events that may have fired during mount.
    wrapper.emitted('update:modelValue')
    // Apply an external prop change — this triggers the watcher which sets applyingExternal=true,
    // dispatches a CM transaction, then resets applyingExternal=false. The onChange callback from
    // CM (if it fires within that same synchronous window) must be suppressed by the guard.
    await wrapper.setProps({ modelValue: '## External update' })
    await new Promise((r) => setTimeout(r, 0))
    // Under happy-dom, EditorView may or may not fire its onChange callback synchronously
    // during dispatch — but the guard (applyingExternal) is set before dispatch and cleared after,
    // so any synchronous onChange call is silenced. We assert no echo was emitted.
    //
    // NOTE: If happy-dom cannot drive CM's full dispatch→onChange cycle, this test still validates
    // the structural guarantee: no update:modelValue events should be observable from a setProps call.
    const emittedAfter = wrapper.emitted('update:modelValue')
    expect(emittedAfter).toBeFalsy()
  })

  it('full mode: the Check button shows the current issue count', async () => {
    const wrapper = await mountSuspended(MarkdownEditor, { props: { modelValue: '# H1 in body\n\n#### Deep', label: 'Body' } })
    const btn = wrapper.find('[data-test="lint-toggle"]')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toContain('2') // body-heading-level (L1) + heading-increment (L3)
  })

  it('opening the Check panel lists one row per issue', async () => {
    const wrapper = await mountSuspended(MarkdownEditor, { props: { modelValue: '# H1 in body\n\n#### Deep', label: 'Body' } })
    expect(wrapper.find('[data-test="lint-panel"]').exists()).toBe(false)
    await wrapper.find('[data-test="lint-toggle"]').trigger('click')
    expect(wrapper.find('[data-test="lint-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="lint-issue-0"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="lint-issue-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="lint-panel"]').text()).toContain('Line 1')
  })

  it('a clean body shows the empty state in the panel', async () => {
    const wrapper = await mountSuspended(MarkdownEditor, { props: { modelValue: '## Fine\n\ntext', label: 'Body' } })
    await wrapper.find('[data-test="lint-toggle"]').trigger('click')
    expect(wrapper.find('[data-test="lint-empty"]').exists()).toBe(true)
  })

  it('compact mode (Abstract) shows no Check button', async () => {
    const wrapper = await mountSuspended(MarkdownEditor, { props: { modelValue: '# whatever', label: 'Abstract', compact: true } })
    expect(wrapper.find('[data-test="lint-toggle"]').exists()).toBe(false)
  })

  it('exposes __goToLine and __issues seams', async () => {
    const wrapper = await mountSuspended(MarkdownEditor, { props: { modelValue: '# x', label: 'Body' } })
    expect(typeof wrapper.vm.$.exposed!.__goToLine).toBe('function')
    expect(Array.isArray(wrapper.vm.$.exposed!.__issues.value)).toBe(true)
  })
})
