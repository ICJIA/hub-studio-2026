// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { App } from '~/types/content'

const createMock = vi.fn(async (m: App): Promise<App> => ({ ...m, documentId: 'appdocN' }))
mockNuxtImport('useApps', () => () => ({
  list: vi.fn(), findOne: vi.fn(), create: createMock, update: vi.fn(), remove: vi.fn(),
}))
mockNuxtImport('useUpload', () => () => ({ upload: vi.fn(), browse: vi.fn().mockResolvedValue([]), remove: vi.fn() }))

import AppForm from '~/components/forms/AppForm.vue'

describe('AppForm', () => {
  beforeEach(() => createMock.mockClear())

  it('blocks create with no title', async () => {
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
})
