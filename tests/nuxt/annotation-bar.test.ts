// tests/nuxt/annotation-bar.test.ts
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AnnotationBar from '~/components/annotations/AnnotationBar.vue'

const base = { armed: false, color: 'yellow' as const, filter: 'open' as const, openCount: 3, railOpen: true, cleanView: false }

describe('AnnotationBar', () => {
  it('shows the open-thread count and arms the highlighter', async () => {
    const wrapper = await mountSuspended(AnnotationBar, { props: base })
    expect(wrapper.text()).toContain('3')
    await wrapper.find('[data-test="ann-arm"]').trigger('click')
    expect(wrapper.emitted('update:armed')![0]).toEqual([true])
  })
  it('emits the picked color and marks it selected (aria-pressed)', async () => {
    const wrapper = await mountSuspended(AnnotationBar, { props: base })
    const green = wrapper.find('[data-test="ann-color-green"]')
    await green.trigger('click')
    expect(wrapper.emitted('update:color')![0]).toEqual(['green'])
    expect(wrapper.find('[data-test="ann-color-yellow"]').attributes('aria-pressed')).toBe('true')
  })
  it('cycles the filter', async () => {
    const wrapper = await mountSuspended(AnnotationBar, { props: base })
    await wrapper.find('[data-test="ann-filter"]').trigger('click')
    expect(wrapper.emitted('update:filter')![0]).toEqual(['resolved'])
  })
  it('announces armed state accessibly', async () => {
    const wrapper = await mountSuspended(AnnotationBar, { props: { ...base, armed: true } })
    expect(wrapper.find('[data-test="ann-arm"]').attributes('aria-pressed')).toBe('true')
  })
  it('clean view collapses every review control to the single toggle and flips its label', async () => {
    const off = await mountSuspended(AnnotationBar, { props: base })
    const toggle = off.find('[data-test="ann-clean-toggle"]')
    expect(toggle.text()).toContain('Clean view')
    expect(toggle.attributes('aria-pressed')).toBe('false')
    expect(off.find('[data-test="ann-arm"]').exists()).toBe(true)
    await toggle.trigger('click')
    expect(off.emitted('update:cleanView')![0]).toEqual([true])

    const on = await mountSuspended(AnnotationBar, { props: { ...base, cleanView: true } })
    const onToggle = on.find('[data-test="ann-clean-toggle"]')
    expect(onToggle.text()).toContain('Show review tools')
    expect(onToggle.attributes('aria-pressed')).toBe('true')
    expect(on.find('[data-test="ann-arm"]').exists()).toBe(false)
    expect(on.find('[data-test="ann-filter"]').exists()).toBe(false)
    expect(on.find('[data-test="ann-rail-toggle"]').exists()).toBe(false)
  })
  it('rail toggle reads as an explicit show/hide toggle (label + aria-expanded track railOpen)', async () => {
    const open = await mountSuspended(AnnotationBar, { props: { ...base, railOpen: true } })
    const openBtn = open.find('[data-test="ann-rail-toggle"]')
    expect(openBtn.text()).toContain('Hide comments (3)')
    expect(openBtn.attributes('aria-expanded')).toBe('true')

    const closed = await mountSuspended(AnnotationBar, { props: { ...base, railOpen: false } })
    const closedBtn = closed.find('[data-test="ann-rail-toggle"]')
    expect(closedBtn.text()).toContain('Show comments (3)')
    expect(closedBtn.attributes('aria-expanded')).toBe('false')
    await closedBtn.trigger('click')
    expect(closed.emitted('toggle-rail')).toBeTruthy()
  })
})
