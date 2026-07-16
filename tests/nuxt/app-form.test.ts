// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { App } from '~/types/content'
import { saveSnapshot, loadSnapshot } from '~/lib/draft-backup'
import { blankApp } from '~/lib/forms/blank-models'

const createMock = vi.fn(async (m: App): Promise<App> => ({ ...m, documentId: 'appdocN' }))
mockNuxtImport('useApps', () => () => ({
  list: vi.fn(), findOne: vi.fn(), create: createMock, update: vi.fn(), remove: vi.fn(),
}))
mockNuxtImport('useUpload', () => () => ({ upload: vi.fn(), browse: vi.fn().mockResolvedValue([]), remove: vi.fn() }))

import AppForm from '~/components/forms/AppForm.vue'

describe('AppForm', () => {
  beforeEach(() => createMock.mockClear())

  it('blocks create with a blank model (title and slug required)', async () => {
    const wrapper = await mountSuspended(AppForm, { props: { mode: 'create' } })
    await wrapper.vm.$.exposed!.submit()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('creates with a slugified slug (title only required — no date)', async () => {
    const wrapper = await mountSuspended(AppForm, { props: { mode: 'create' } })
    wrapper.vm.$.exposed!.setField('title', 'UCR Index Offense Explorer')
    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))
    expect(createMock).toHaveBeenCalledOnce()
    const call = createMock.mock.calls[0]
    expect(call![0].slug).toBe('ucr-index-offense-explorer')
  })

  it('blocks create when description contains base64', async () => {
    const wrapper = await mountSuspended(AppForm, { props: { mode: 'create' } })
    wrapper.vm.$.exposed!.setField('title', 'My App')
    wrapper.vm.$.exposed!.setField('description', 'data:image/png;base64,abc123==')
    await wrapper.vm.$.exposed!.submit()
    expect(createMock).not.toHaveBeenCalled()
    const errs = wrapper.vm.$.exposed!.errors.value
    expect(errs.some((e: { field: string }) => e.field === 'description')).toBe(true)
  })
})

describe('unsaved-work guard integration', () => {
  beforeEach(() => localStorage.clear())

  // Edit-mode fixture: blankApp() spread with just enough (title/slug — validateApp needs no
  // date) to clear validateApp, so submit() reaches persist without extra setField calls.
  // documentId is overridden per-use, same pattern as article-form.test.ts's sampleInitial.
  const sampleInitial: App = {
    ...blankApp(),
    title: 'UCR Index Offense Explorer',
    slug: 'ucr-index-offense-explorer',
  }

  it('shows the restore banner when a snapshot exists for this draft', async () => {
    saveSnapshot('app', 'ap1', { ...blankApp(), title: 'Recovered title' }, '2026-07-16T09:00:00.000Z')
    const wrapper = await mountSuspended(AppForm, { props: { mode: 'edit', initial: { ...sampleInitial, documentId: 'ap1' } } })
    expect(wrapper.find('[data-test="draft-restore-banner"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows no banner without a snapshot', async () => {
    const wrapper = await mountSuspended(AppForm, { props: { mode: 'edit', initial: { ...sampleInitial, documentId: 'ap1' } } })
    expect(wrapper.find('[data-test="draft-restore-banner"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('a successful save clears the snapshot (clear-on-save invariant)', async () => {
    saveSnapshot('app', 'ap1', { ...blankApp(), title: 'Old backup' }, '2026-07-16T09:00:00.000Z')
    const wrapper = await mountSuspended(AppForm, { props: { mode: 'edit', initial: { ...sampleInitial, documentId: 'ap1' } } })
    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))
    expect(loadSnapshot('app', 'ap1')).toBeNull()
    wrapper.unmount()
  })
})
