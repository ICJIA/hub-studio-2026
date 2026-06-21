// tests/nuxt/routing-smoke.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

mockNuxtImport('useUpload', () => () => ({ upload: vi.fn(), browse: vi.fn().mockResolvedValue([]), remove: vi.fn() }))

const findOneMock = vi.fn().mockResolvedValue({ documentId: 'a1', title: 'Existing', markdown: '', categories: [], tags: [], authors: [], images: [], apps: [], datasets: [], splash: null, thumbnail: null, mainfile: null, extrafile: null, type: null, mainfiletype: null, abstract: null, doi: null, citation: null, funding: null, date: '2020-01-01', slug: 'existing', external: false, hideFromBanner: false, publishedAt: null })
mockNuxtImport('useArticles', () => () => ({ list: vi.fn().mockResolvedValue([]), listPage: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25, pageCount: 1 }), findOne: findOneMock, create: vi.fn(), update: vi.fn(), remove: vi.fn(), publish: vi.fn() }))

const appFindOneMock = vi.fn().mockResolvedValue({ documentId: 'app1', title: 'Existing App', date: '2020-01-01', slug: 'existing-app', categories: [], tags: [], contributors: [], image: null, description: '', url: '', datasets: [], articles: [], publishedAt: null })
mockNuxtImport('useApps', () => () => ({ list: vi.fn().mockResolvedValue([]), listPage: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25, pageCount: 1 }), findOne: appFindOneMock, create: vi.fn(), update: vi.fn(), remove: vi.fn(), publish: vi.fn() }))

const datasetFindOneMock = vi.fn().mockResolvedValue({ documentId: 'ds1', title: 'Existing Dataset', date: '2020-01-01', slug: 'existing-dataset', categories: [], tags: [], description: '', unit: '', timeperiod: null, sources: [], variables: [], notes: [], project: false, datafile: null, apps: [], articles: [], publishedAt: null })
mockNuxtImport('useDatasets', () => () => ({ list: vi.fn().mockResolvedValue([]), listPage: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25, pageCount: 1 }), findOne: datasetFindOneMock, create: vi.fn(), update: vi.fn(), remove: vi.fn(), publish: vi.fn() }))

const routeRef = { params: { type: 'article', documentId: 'a1' } }
mockNuxtImport('useRoute', () => () => routeRef)

const managerCanPublish = ref(true)
mockNuxtImport('useAuth', () => () => ({
  user: computed(() => ({ email: 'manager@example.com' })),
  canPublish: managerCanPublish, isLoggedIn: computed(() => true), logout: vi.fn(),
}))

import CreatePage from '~/pages/create/[type].vue'
import EditPage from '~/pages/edit/[type]/[documentId].vue'
import ManagePage from '~/pages/manage.vue'

describe('routing glue', () => {
  it('/create/:type renders a create form (Save draft button)', async () => {
    routeRef.params.type = 'article'
    const wrapper = await mountSuspended(CreatePage)
    expect(wrapper.text()).toContain('Save draft')
  })

  it('/edit/:type/:documentId loads the entry then renders the edit form', async () => {
    routeRef.params.type = 'article'
    routeRef.params.documentId = 'a1'
    const wrapper = await mountSuspended(EditPage)
    await new Promise((r) => setTimeout(r, 0))
    expect(findOneMock).toHaveBeenCalledWith('a1', expect.anything())
    expect(wrapper.text()).toContain('Save draft')
  })

  it('/manage renders the publish queue (no longer a Plan-6 placeholder)', async () => {
    const wrapper = await mountSuspended(ManagePage)
    expect(wrapper.text()).toMatch(/Publish queue|Drafts/i)
    expect(wrapper.text()).not.toMatch(/Coming in Plan 6/i)
  })

  // Step 2: structural guard — fails if definePageMeta({ adminOnly: true }) is removed
  it('/manage source declares adminOnly: true', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'app/pages/manage.vue'),
      'utf8',
    )
    expect(src).toContain('adminOnly: true')
  })

  // Step 3: app and dataset type-dispatch branches on the create page
  it('/create/app mounts the AppForm (heading + Save draft)', async () => {
    routeRef.params.type = 'app'
    const wrapper = await mountSuspended(CreatePage)
    // The page heading is "New app" and AppForm renders Save draft
    expect(wrapper.text()).toContain('New app')
    expect(wrapper.text()).toContain('Save draft')
  })

  it('/create/dataset mounts the DatasetForm (heading + Time period)', async () => {
    routeRef.params.type = 'dataset'
    const wrapper = await mountSuspended(CreatePage)
    // The page heading is "New dataset" and DatasetForm has a direct UFormField label
    expect(wrapper.text()).toContain('New dataset')
    // DatasetForm uses <UFormField label="Time period"> directly in template (not via a stub child)
    expect(wrapper.text()).toContain('Time period')
  })
})
