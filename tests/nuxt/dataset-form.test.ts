// tests/nuxt/dataset-form.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { Dataset } from '~/types/content'

const createMock = vi.fn(async (m: Dataset): Promise<Dataset> => ({ ...m, documentId: 'dsdocN' }))
mockNuxtImport('useDatasets', () => () => ({
  list: vi.fn(), findOne: vi.fn(), create: createMock, update: vi.fn(), remove: vi.fn(),
}))
mockNuxtImport('useUpload', () => () => ({ upload: vi.fn(), browse: vi.fn().mockResolvedValue([]), remove: vi.fn() }))

import DatasetForm from '~/components/forms/DatasetForm.vue'

describe('DatasetForm', () => {
  beforeEach(() => createMock.mockClear())

  it('blocks create when required fields are missing', async () => {
    const wrapper = await mountSuspended(DatasetForm, { props: { mode: 'create' } })
    await wrapper.vm.$.exposed!.submit()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('creates with a slugified slug and carries variables/sources through', async () => {
    const wrapper = await mountSuspended(DatasetForm, { props: { mode: 'create' } })
    wrapper.vm.$.exposed!.setField('title', 'Crime Data')
    wrapper.vm.$.exposed!.setField('date', '2021-01-01')
    wrapper.vm.$.exposed!.setField('variables', [{ name: 'Year', type: 'integer', definition: 'The year' }])
    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))
    expect(createMock).toHaveBeenCalledOnce()
    expect(createMock.mock.calls[0]![0].slug).toBe('crime-data')
    expect(createMock.mock.calls[0]![0].variables).toHaveLength(1)
  })

  it('carries project:true through to the create payload', async () => {
    const wrapper = await mountSuspended(DatasetForm, { props: { mode: 'create' } })
    wrapper.vm.$.exposed!.setField('title', 'Project Dataset')
    wrapper.vm.$.exposed!.setField('date', '2021-01-01')
    wrapper.vm.$.exposed!.setField('project', true)
    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))
    expect(createMock).toHaveBeenCalledOnce()
    const call = createMock.mock.calls[0]
    expect(call![0].project).toBe(true)
  })

  it('blocks create when description contains base64', async () => {
    const wrapper = await mountSuspended(DatasetForm, { props: { mode: 'create' } })
    wrapper.vm.$.exposed!.setField('title', 'My Dataset')
    wrapper.vm.$.exposed!.setField('date', '2021-01-01')
    wrapper.vm.$.exposed!.setField('description', 'data:image/png;base64,abc123==')
    await wrapper.vm.$.exposed!.submit()
    expect(createMock).not.toHaveBeenCalled()
    const errs = wrapper.vm.$.exposed!.errors.value
    expect(errs.some((e: { field: string }) => e.field === 'description')).toBe(true)
  })
})
