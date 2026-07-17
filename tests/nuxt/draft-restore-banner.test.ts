// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import DraftRestoreBanner from '~/components/DraftRestoreBanner.vue'

describe('DraftRestoreBanner', () => {
  it('announces the unsaved changes with the snapshot time, as a status region', async () => {
    const wrapper = await mountSuspended(DraftRestoreBanner, {
      props: { savedAt: '2026-07-16T14:41:00.000Z' },
    })
    const banner = wrapper.find('[data-test="draft-restore-banner"]')
    expect(banner.exists()).toBe(true)
    expect(banner.attributes('role')).toBe('status')
    expect(banner.text()).toContain('Unsaved changes')
  })

  it('emits restore and discard from its two buttons', async () => {
    const wrapper = await mountSuspended(DraftRestoreBanner, {
      props: { savedAt: '2026-07-16T14:41:00.000Z' },
    })
    await wrapper.find('[data-test="draft-restore"]').trigger('click')
    await wrapper.find('[data-test="draft-discard"]').trigger('click')
    expect(wrapper.emitted('restore')).toHaveLength(1)
    expect(wrapper.emitted('discard')).toHaveLength(1)
  })

  // Final-review fix round 1 (Critical, mirror of ConflictBanner's own busy prop): this banner
  // can be mounted MID-FLIGHT by ArticleForm/AppForm/DatasetForm's loadTheirs() (its
  // snapshotNow() flips draftGuard.restoreAvailable true before its own findOne() await
  // settles) — without a busy-disable, an impatient click on either button here during that
  // window would run the guard's raw restore()/discard() and clear the very snapshot
  // snapshotNow() just wrote to protect the author's pre-replace edits.
  it('busy disables both buttons, and neither emits on a click while disabled', async () => {
    const wrapper = await mountSuspended(DraftRestoreBanner, {
      props: { savedAt: '2026-07-16T14:41:00.000Z', busy: true },
    })
    const restore = wrapper.find('[data-test="draft-restore"]')
    const discard = wrapper.find('[data-test="draft-discard"]')
    expect(restore.attributes('disabled')).toBeDefined()
    expect(discard.attributes('disabled')).toBeDefined()

    await restore.trigger('click')
    await discard.trigger('click')
    expect(wrapper.emitted('restore')).toBeUndefined()
    expect(wrapper.emitted('discard')).toBeUndefined()
  })
})
