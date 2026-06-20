// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'

const listMock = vi.fn().mockResolvedValue([
  { documentId: 'a1', title: 'First Draft', publishedAt: null },
  { documentId: 'a2', title: 'Second Draft', publishedAt: null },
])
mockNuxtImport('useArticles', () => () => ({ list: listMock, findOne: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() }))

import ContentList from '~/components/ContentList.vue'

describe('ContentList', () => {
  it('lists items from repo.list and links to edit/preview', async () => {
    const wrapper = await mountSuspended(ContentList, { props: { type: 'article', status: 'draft' } })
    await new Promise((r) => setTimeout(r, 0))
    expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }))
    expect(wrapper.text()).toContain('First Draft')
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain('/edit/article/a1')
    expect(hrefs).toContain('/preview/article/a1')
  })
})
