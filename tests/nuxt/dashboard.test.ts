// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'

const canPublish = ref(false)
mockNuxtImport('useAuth', () => () => ({
  user: computed(() => ({ email: 'writer@example.com', firstname: 'Wendy' })),
  canPublish, isLoggedIn: computed(() => true), logout: vi.fn(),
}))
// ContentList mounts repos; stub list so the dashboard renders without network.
mockNuxtImport('useArticles', () => () => ({ list: vi.fn().mockResolvedValue([]), findOne: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() }))

import Dashboard from '~/pages/index.vue'

describe('dashboard', () => {
  it('hides the Publish queue card for non-publishers', async () => {
    canPublish.value = false
    const wrapper = await mountSuspended(Dashboard)
    expect(wrapper.text()).not.toContain('Publish queue')
  })
  it('shows the Publish queue card for publishers', async () => {
    canPublish.value = true
    const wrapper = await mountSuspended(Dashboard)
    expect(wrapper.text()).toContain('Publish queue')
  })
})
