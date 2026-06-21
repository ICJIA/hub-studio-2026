// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'

const canPublish = ref(false)
mockNuxtImport('useAuth', () => () => ({
  user: computed(() => ({ email: 'writer@example.com', firstname: 'Wendy' })),
  canPublish, isLoggedIn: computed(() => true), logout: vi.fn(),
}))

const createMock = vi.fn()
// ContentList mounts repos; stub list so the dashboard renders without network.
mockNuxtImport('useArticles', () => () => ({
  list: vi.fn().mockResolvedValue([]),
  findOne: vi.fn(),
  create: createMock,
  update: vi.fn(),
  remove: vi.fn(),
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

  it('renders the "Add sample article" button', async () => {
    canPublish.value = false
    const wrapper = await mountSuspended(Dashboard)
    expect(wrapper.text()).toContain('Add sample article')
  })

  it('links "Add sample article" to the create form seeded with the sample (?sample=1)', async () => {
    canPublish.value = false
    const wrapper = await mountSuspended(Dashboard)
    const link = wrapper.findAll('a').find((a) => a.text().includes('Add sample article'))
    expect(link).toBeDefined()
    expect(link!.attributes('href')).toContain('/create/article')
    expect(link!.attributes('href')).toContain('sample=1')
  })
})
