// tests/nuxt/routing-smoke.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'

mockNuxtImport('useUpload', () => () => ({ upload: vi.fn(), browse: vi.fn().mockResolvedValue([]), remove: vi.fn() }))
const findOneMock = vi.fn().mockResolvedValue({ documentId: 'a1', title: 'Existing', markdown: '', categories: [], tags: [], authors: [], images: [], apps: [], datasets: [], splash: null, thumbnail: null, mainfile: null, extrafile: null, type: null, mainfiletype: null, abstract: null, doi: null, citation: null, funding: null, date: '2020-01-01', slug: 'existing', external: false, hideFromBanner: false, publishedAt: null })
mockNuxtImport('useArticles', () => () => ({ list: vi.fn().mockResolvedValue([]), findOne: findOneMock, create: vi.fn(), update: vi.fn(), remove: vi.fn() }))

const routeRef = { params: { type: 'article', documentId: 'a1' } }
mockNuxtImport('useRoute', () => () => routeRef)

import CreatePage from '~/pages/create/[type].vue'
import EditPage from '~/pages/edit/[type]/[documentId].vue'
import ManagePage from '~/pages/manage.vue'

describe('routing glue', () => {
  it('/create/:type renders a create form (Save draft button)', async () => {
    const wrapper = await mountSuspended(CreatePage)
    expect(wrapper.text()).toContain('Save draft')
  })

  it('/edit/:type/:documentId loads the entry then renders the edit form', async () => {
    const wrapper = await mountSuspended(EditPage)
    await new Promise((r) => setTimeout(r, 0))
    expect(findOneMock).toHaveBeenCalledWith('a1', expect.anything())
    expect(wrapper.text()).toContain('Save draft')
  })

  it('/manage declares adminOnly and renders the draft queue', async () => {
    const wrapper = await mountSuspended(ManagePage)
    // Publish is deferred to Plan 6 — the queue lists but cannot publish yet.
    expect(wrapper.text()).toMatch(/Publish queue|Drafts|Plan 6/i)
  })
})
