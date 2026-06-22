// tests/nuxt/main-files-field.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { MediaRef } from '~/types/content'

// MainFilesField uploads PDFs via useUpload().uploadDocument — mock it so no network is hit.
function pdfRef(id: number, name: string): MediaRef {
  return { id, url: `/uploads/${name}`, name, alternativeText: null, caption: null, mime: 'application/pdf' }
}
const uploadDocumentMock = vi.fn()
mockNuxtImport('useUpload', () => () => ({
  upload: vi.fn(),
  uploadDocument: uploadDocumentMock,
  browse: vi.fn().mockResolvedValue([]),
  remove: vi.fn(),
}))

// runtimeConfig: NOT demo (so the field uploads instead of seeding), max = 3 (the default cap).
mockNuxtImport('useRuntimeConfig', () => () => ({
  app: { baseURL: '/' },
  public: { demoMode: false, maxMainFiles: 3, strapiBaseUrl: 'https://example.invalid', appName: 'Studio' },
}))

import MainFilesField from '~/components/forms/MainFilesField.vue'

/** Mount with a v-model bridge: emitted update:modelValue is fed back as the prop. */
async function mountWithModel(initial: MediaRef[] = []) {
  let model = initial
  const wrapper = await mountSuspended(MainFilesField, {
    props: {
      modelValue: model,
      'onUpdate:modelValue': async (v: MediaRef[]) => {
        model = v
        await wrapper.setProps({ modelValue: v })
      },
    },
  })
  return { wrapper, get model() { return model } }
}

describe('MainFilesField (Main Files — PDF attachments)', () => {
  it('uploading PDFs via __handleFiles adds them to the list as MediaRefs', async () => {
    uploadDocumentMock.mockReset()
    uploadDocumentMock.mockResolvedValueOnce(pdfRef(1, 'report.pdf'))
    const m = await mountWithModel()
    const file = new File(['x'], 'report.pdf', { type: 'application/pdf' })
    await m.wrapper.vm.$.exposed!.__handleFiles([file])
    await new Promise((r) => setTimeout(r, 0))
    expect(uploadDocumentMock).toHaveBeenCalledWith(file)
    expect(m.model).toHaveLength(1)
    expect(m.model[0]!.name).toBe('report.pdf')
  })

  it('lists each file by filename', async () => {
    const m = await mountWithModel([pdfRef(1, 'first.pdf'), pdfRef(2, 'second.pdf')])
    const html = m.wrapper.html()
    expect(html).toContain('first.pdf')
    expect(html).toContain('second.pdf')
    expect(m.wrapper.findAll('[data-test^="main-file-item-"]')).toHaveLength(2)
  })

  it('removing a file drops it from the list', async () => {
    const m = await mountWithModel([pdfRef(1, 'a.pdf'), pdfRef(2, 'b.pdf'), pdfRef(3, 'c.pdf')])
    m.wrapper.vm.$.exposed!.__removeAt(1) // remove b.pdf
    await new Promise((r) => setTimeout(r, 0))
    expect(m.model.map((f) => f.name)).toEqual(['a.pdf', 'c.pdf'])
  })

  it('enforces the max of 3: extra uploads are not added past the cap', async () => {
    uploadDocumentMock.mockReset()
    uploadDocumentMock
      .mockResolvedValueOnce(pdfRef(1, 'one.pdf'))
      .mockResolvedValueOnce(pdfRef(2, 'two.pdf'))
      .mockResolvedValueOnce(pdfRef(3, 'three.pdf'))
      .mockResolvedValueOnce(pdfRef(4, 'four.pdf'))
    const m = await mountWithModel()
    const files = ['one', 'two', 'three', 'four'].map((n) => new File(['x'], `${n}.pdf`, { type: 'application/pdf' }))
    await m.wrapper.vm.$.exposed!.__handleFiles(files)
    await new Promise((r) => setTimeout(r, 0))
    expect(m.model).toHaveLength(3) // capped at maxMainFiles
    expect(m.model.map((f) => f.name)).toEqual(['one.pdf', 'two.pdf', 'three.pdf'])
    // The 4th upload is never attempted once the cap is reached.
    expect(uploadDocumentMock).toHaveBeenCalledTimes(3)
  })

  it('at the max it disables Add and shows the max hint', async () => {
    const m = await mountWithModel([pdfRef(1, 'a.pdf'), pdfRef(2, 'b.pdf'), pdfRef(3, 'c.pdf')])
    expect(m.wrapper.find('[data-test="main-files-max-hint"]').exists()).toBe(true)
    const addBtn = m.wrapper.find('[data-test="main-files-add"]')
    expect(addBtn.attributes('disabled')).toBeDefined()
  })

  it('shows the empty state when there are no files (non-demo)', async () => {
    const m = await mountWithModel([])
    expect(m.wrapper.find('[data-test="main-files-empty"]').exists()).toBe(true)
  })

  it('the max reflects runtimeConfig.public.maxMainFiles (single source of truth)', async () => {
    const m = await mountWithModel([])
    expect(m.wrapper.vm.$.exposed!.__maxFiles.value).toBe(3)
  })
})
