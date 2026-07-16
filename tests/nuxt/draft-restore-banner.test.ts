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
})
