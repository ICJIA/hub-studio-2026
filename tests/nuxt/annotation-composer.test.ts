// tests/nuxt/annotation-composer.test.ts
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AnnotationComposer from '~/components/annotations/AnnotationComposer.vue'

const props = { position: { x: 120, y: 240 }, quote: 'the quick brown fox' }

describe('AnnotationComposer', () => {
  it('shows the quote, disables Save while empty, saves trimmed body', async () => {
    const wrapper = await mountSuspended(AnnotationComposer, { props })
    expect(wrapper.text()).toContain('the quick brown fox')
    const save = wrapper.find('[data-test="ann-save"]')
    expect(save.attributes('disabled')).toBeDefined()
    await wrapper.find('textarea').setValue('  Needs a citation.  ')
    await wrapper.find('[data-test="ann-save"]').trigger('click')
    expect(wrapper.emitted('save')![0]).toEqual(['Needs a citation.'])
  })
  it('cancels on Escape', async () => {
    const wrapper = await mountSuspended(AnnotationComposer, { props })
    await wrapper.find('textarea').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
  it('positions itself at the given viewport coordinates', async () => {
    const wrapper = await mountSuspended(AnnotationComposer, { props })
    const style = wrapper.find('.ann-composer').attributes('style') ?? ''
    expect(style).toContain('120px')
    expect(style).toContain('240px')
  })
})
