// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ConflictBanner from '~/components/ConflictBanner.vue'

describe('ConflictBanner', () => {
  it('announces the conflict with their save time, as an alert region (not status — this interrupts a save)', async () => {
    const wrapper = await mountSuspended(ConflictBanner, {
      props: { theirSavedAt: '2026-07-16T14:41:00.000Z' },
    })
    const banner = wrapper.find('[data-test="conflict-banner"]')
    expect(banner.exists()).toBe(true)
    expect(banner.attributes('role')).toBe('alert')
    // Exact copy (brief-mandated wording), formatted time included verbatim (same
    // toLocaleString the component uses — locale/timezone-agnostic since both sides of this
    // comparison run in the same process).
    const expectedTime = new Date('2026-07-16T14:41:00.000Z').toLocaleString()
    expect(banner.text()).toContain(
      `This draft was changed by someone else while you were editing (their save: ${expectedTime}).`,
    )
  })

  it('emits saveAnyway and loadTheirs from its two buttons', async () => {
    const wrapper = await mountSuspended(ConflictBanner, {
      props: { theirSavedAt: '2026-07-16T14:41:00.000Z' },
    })
    await wrapper.find('[data-test="conflict-save-anyway"]').trigger('click')
    await wrapper.find('[data-test="conflict-load-theirs"]').trigger('click')
    expect(wrapper.emitted('saveAnyway')).toHaveLength(1)
    expect(wrapper.emitted('loadTheirs')).toHaveLength(1)
  })

  it('falls back to the raw string for an unparseable saved-at (mirrors DraftRestoreBanner)', async () => {
    const wrapper = await mountSuspended(ConflictBanner, {
      props: { theirSavedAt: 'not-a-date' },
    })
    expect(wrapper.find('[data-test="conflict-banner"]').text()).toContain('their save: not-a-date')
  })
})
