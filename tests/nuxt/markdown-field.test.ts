// tests/nuxt/markdown-field.test.ts
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import MarkdownField from '~/components/MarkdownField.vue'

describe('MarkdownField (the Plan-4 editor seam)', () => {
  it('renders the bound value in the live preview', async () => {
    const wrapper = await mountSuspended(MarkdownField, { props: { modelValue: '# Hello', label: 'Body' } })
    expect(wrapper.find('.prose-preview').html()).toMatch(/<h1[^>]*>Hello<\/h1>/)
  })

  it('emits update:modelValue when the textarea changes', async () => {
    const wrapper = await mountSuspended(MarkdownField, { props: { modelValue: '', label: 'Body' } })
    const ta = wrapper.find('textarea')
    await ta.setValue('## Edited')
    const events = wrapper.emitted('update:modelValue')
    expect(events).toBeTruthy()
    expect(events![events!.length - 1]![0]).toBe('## Edited')
  })
})
