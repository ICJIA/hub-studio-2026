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

  it('clicking "Add sample article" calls useArticles().create once with a valid article', async () => {
    createMock.mockResolvedValue({ documentId: 'demo123' })
    const wrapper = await mountSuspended(Dashboard)
    const btn = wrapper.findAll('button').find((b) => b.text().includes('Add sample article'))
    expect(btn).toBeDefined()
    await btn!.trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(createMock).toHaveBeenCalledOnce()
    const arg = createMock.mock.calls[0]![0]
    expect(arg.title).toBe('Crime in Illinois: 2024 Trends and Analysis')
    expect(arg.publishedAt).toBeNull()
  })

  it('shows loading state while sample article is being created', async () => {
    // create never resolves during this test, so loading stays true
    createMock.mockImplementation(() => new Promise(() => {}))
    const wrapper = await mountSuspended(Dashboard)
    const btn = wrapper.findAll('button').find((b) => b.text().includes('Add sample article'))
    await btn!.trigger('click')
    await nextTick()
    // Button should be disabled while loading
    expect(btn!.attributes('disabled')).toBeDefined()
  })
})
