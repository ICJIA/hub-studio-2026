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
  it('emits the picked color; swatches are radios in a radiogroup (aria-checked tracks selection)', async () => {
    const wrapper = await mountSuspended(AnnotationBar, { props: base })
    const group = wrapper.find('[role="radiogroup"]')
    expect(group.exists()).toBe(true)
    expect(group.attributes('aria-label')).toBe('Highlight color')
    const yellow = wrapper.find('[data-test="ann-color-yellow"]')
    const green = wrapper.find('[data-test="ann-color-green"]')
    expect(yellow.attributes('role')).toBe('radio')
    expect(yellow.attributes('aria-checked')).toBe('true')
    expect(green.attributes('aria-checked')).toBe('false')
    await green.trigger('click')
    expect(wrapper.emitted('update:color')![0]).toEqual(['green'])
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
  it('toolbar is a single tab stop: only the roving control is tabbable (initially the clean toggle)', async () => {
    const wrapper = await mountSuspended(AnnotationBar, { props: base })
    expect(wrapper.find('[data-test="ann-clean-toggle"]').attributes('tabindex')).toBe('0')
    for (const sel of ['ann-arm', 'ann-color-yellow', 'ann-color-green', 'ann-color-blue', 'ann-color-pink', 'ann-filter', 'ann-rail-toggle']) {
      expect(wrapper.find(`[data-test="${sel}"]`).attributes('tabindex')).toBe('-1')
    }
  })
  it('ArrowRight/ArrowLeft move the roving focus through the toolbar (wrapping); Home/End jump', async () => {
    const wrapper = await mountSuspended(AnnotationBar, { props: base, attachTo: document.body })
    const el = (sel: string) => wrapper.find(`[data-test="${sel}"]`)
    ;(el('ann-clean-toggle').element as HTMLElement).focus()
    await el('ann-clean-toggle').trigger('keydown', { key: 'ArrowRight' })
    expect(document.activeElement?.getAttribute('data-test')).toBe('ann-arm')
    expect(el('ann-arm').attributes('tabindex')).toBe('0')
    expect(el('ann-clean-toggle').attributes('tabindex')).toBe('-1')
    await el('ann-arm').trigger('keydown', { key: 'ArrowRight' })
    expect(document.activeElement?.getAttribute('data-test')).toBe('ann-color-yellow')
    await el('ann-color-yellow').trigger('keydown', { key: 'ArrowLeft' })
    expect(document.activeElement?.getAttribute('data-test')).toBe('ann-arm')
    await el('ann-arm').trigger('keydown', { key: 'End' })
    expect(document.activeElement?.getAttribute('data-test')).toBe('ann-rail-toggle')
    await el('ann-rail-toggle').trigger('keydown', { key: 'ArrowRight' }) // wraps
    expect(document.activeElement?.getAttribute('data-test')).toBe('ann-clean-toggle')
    await el('ann-clean-toggle').trigger('keydown', { key: 'ArrowLeft' }) // wraps back
    expect(document.activeElement?.getAttribute('data-test')).toBe('ann-rail-toggle')
    await el('ann-rail-toggle').trigger('keydown', { key: 'Home' })
    expect(document.activeElement?.getAttribute('data-test')).toBe('ann-clean-toggle')
    wrapper.unmount()
  })
  it('clicking (focusing) any control hands it the roving tab stop', async () => {
    const wrapper = await mountSuspended(AnnotationBar, { props: base, attachTo: document.body })
    const filter = wrapper.find('[data-test="ann-filter"]')
    ;(filter.element as HTMLElement).focus()
    await filter.trigger('focus')
    expect(filter.attributes('tabindex')).toBe('0')
    expect(wrapper.find('[data-test="ann-clean-toggle"]').attributes('tabindex')).toBe('-1')
    wrapper.unmount()
  })
  it('entering clean view while the roving stop sits on a now-hidden control resets it to the toggle', async () => {
    const wrapper = await mountSuspended(AnnotationBar, { props: base, attachTo: document.body })
    const filter = wrapper.find('[data-test="ann-filter"]')
    ;(filter.element as HTMLElement).focus()
    await filter.trigger('focus')
    expect(filter.attributes('tabindex')).toBe('0')
    await wrapper.setProps({ cleanView: true })
    expect(wrapper.find('[data-test="ann-filter"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="ann-clean-toggle"]').attributes('tabindex')).toBe('0')
    wrapper.unmount()
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
