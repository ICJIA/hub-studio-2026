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

  // Fix round 1 (Critical): this banner deliberately stays mounted across loadTheirs()'s own
  // await in ArticleForm (see that component), so its buttons must be disable-able independent
  // of anything ArticleForm does with v-if. Without this, an impatient Save-anyway click while
  // Load-theirs is still fetching bypasses the conflict check on a STALE model — the exact
  // silent-overwrite this feature exists to prevent.
  it('disables both buttons while busy, and neither emits on a click while disabled', async () => {
    const wrapper = await mountSuspended(ConflictBanner, {
      props: { theirSavedAt: '2026-07-16T14:41:00.000Z', busy: true },
    })
    const saveAnyway = wrapper.find('[data-test="conflict-save-anyway"]')
    const loadTheirs = wrapper.find('[data-test="conflict-load-theirs"]')
    expect(saveAnyway.attributes('disabled')).toBeDefined()
    expect(loadTheirs.attributes('disabled')).toBeDefined()

    // Belt-and-suspenders: a synthetic click on the disabled button must not emit — the actual
    // race-closing logic lives in ArticleForm's own `saving` guards, this just confirms the UI
    // layer doesn't offer a click path around them.
    await saveAnyway.trigger('click')
    await loadTheirs.trigger('click')
    expect(wrapper.emitted('saveAnyway')).toBeUndefined()
    expect(wrapper.emitted('loadTheirs')).toBeUndefined()
  })

  it('is enabled (not disabled) when busy is false or omitted', async () => {
    const wrapper = await mountSuspended(ConflictBanner, {
      props: { theirSavedAt: '2026-07-16T14:41:00.000Z' },
    })
    expect(wrapper.find('[data-test="conflict-save-anyway"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[data-test="conflict-load-theirs"]').attributes('disabled')).toBeUndefined()
  })
})
