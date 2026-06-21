// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'

const canPublish = ref(false)
mockNuxtImport('useAuth', () => () => ({
  user: computed(() => ({ email: 'writer@example.com', firstname: 'Wendy' })),
  canPublish, isLoggedIn: computed(() => true), logout: vi.fn(),
}))

const createMock = vi.fn()
// ContentList calls listPage — provide both to satisfy the Repository<T> interface
mockNuxtImport('useArticles', () => () => ({
  list: vi.fn().mockResolvedValue([]),
  listPage: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25, pageCount: 1 }),
  findOne: vi.fn(),
  create: createMock,
  update: vi.fn(),
  remove: vi.fn(),
  publish: vi.fn(),
}))

import Dashboard from '~/pages/index.vue'

describe('dashboard', () => {
  beforeEach(() => { createMock.mockReset() })

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

  it('gates the dev/demo sample shortcuts out of production builds', async () => {
    // The sample-content shortcuts live behind import.meta.dev (false in this build), so they are
    // tree-shaken from production and never ship to the live site — see app/pages/index.vue.
    canPublish.value = false
    const wrapper = await mountSuspended(Dashboard)
    expect(wrapper.text()).not.toContain('Add sample article')
    expect(wrapper.text()).not.toContain('Sample content')
    // The real create actions remain.
    expect(wrapper.text()).toContain('New article')
  })
})
