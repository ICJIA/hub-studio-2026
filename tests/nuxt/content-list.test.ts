// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { PagedResult } from '~/lib/repository'

const DRAFT_ITEMS = [
  { documentId: 'a1', title: 'First Draft', date: '2024-03-15', publishedAt: null, authors: [{ title: 'Alice Smith, MA' }], updatedAt: '2026-01-02T10:00:00.000Z' },
  { documentId: 'a2', title: 'Second Draft', date: '2024-01-10', publishedAt: null, authors: [{ title: 'Bob Jones, PhD' }, { title: 'Carol White, MA' }], updatedAt: '2026-01-01T10:00:00.000Z' },
]

const PUBLISHED_ITEM = {
  documentId: 'a3', title: 'Published Article', date: '2023-11-01', publishedAt: '2024-01-01T12:00:00.000Z', authors: [{ title: 'Dan Green, JD' }], updatedAt: '2026-01-03T10:00:00.000Z'
}

function makePagedResult<T>(items: T[], total?: number): PagedResult<T> {
  return { items, total: total ?? items.length, page: 1, pageSize: 25, pageCount: 1 }
}

const listPageMock = vi.fn().mockResolvedValue(makePagedResult(DRAFT_ITEMS))
const listMock = vi.fn().mockResolvedValue(DRAFT_ITEMS)

mockNuxtImport('useArticles', () => () => ({
  list: listMock,
  listPage: listPageMock,
  findOne: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  publish: vi.fn(),
}))

import ContentList from '~/components/ContentList.vue'

describe('ContentList', () => {
  it('calls repo.listPage with the given status and renders rows', async () => {
    const wrapper = await mountSuspended(ContentList, { props: { type: 'article', status: 'draft' } })
    await new Promise((r) => setTimeout(r, 0))
    expect(listPageMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }))
    expect(wrapper.text()).toContain('First Draft')
    expect(wrapper.text()).toContain('Second Draft')
  })

  it('links to edit and preview for each item', async () => {
    const wrapper = await mountSuspended(ContentList, { props: { type: 'article', status: 'draft' } })
    await new Promise((r) => setTimeout(r, 0))
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain('/edit/article/a1')
    expect(hrefs).toContain('/preview/article/a1')
  })

  it('renders Date column with formatted dates', async () => {
    const wrapper = await mountSuspended(ContentList, { props: { type: 'article', status: 'draft' } })
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.text()).toContain('2024-03-15')
    expect(wrapper.text()).toContain('2024-01-10')
  })

  it('renders Author(s) column with first 2 names', async () => {
    const wrapper = await mountSuspended(ContentList, { props: { type: 'article', status: 'draft' } })
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.text()).toContain('Alice Smith, MA')
    expect(wrapper.text()).toContain('Bob Jones, PhD')
  })

  it('renders Status badge: Draft for unpublished items', async () => {
    const wrapper = await mountSuspended(ContentList, { props: { type: 'article', status: 'draft' } })
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.text()).toContain('Draft')
  })

  it('renders Status badge: Published for published items', async () => {
    listPageMock.mockResolvedValueOnce(makePagedResult([PUBLISHED_ITEM]))
    const wrapper = await mountSuspended(ContentList, { props: { type: 'article' } })
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.text()).toContain('Published')
  })

  it('renders pager with page info', async () => {
    listPageMock.mockResolvedValueOnce({
      items: DRAFT_ITEMS, total: 50, page: 1, pageSize: 25, pageCount: 2,
    })
    const wrapper = await mountSuspended(ContentList, { props: { type: 'article' } })
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.text()).toContain('Page 1 of 2')
    expect(wrapper.text()).toContain('50 total')
  })

  it('shows empty state when total is 0', async () => {
    listPageMock.mockResolvedValueOnce(makePagedResult([]))
    const wrapper = await mountSuspended(ContentList, { props: { type: 'article' } })
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.text()).toContain('yet')
  })

  it('truncates to 2 authors with "+N more" suffix', async () => {
    const threeAuthors = [{
      documentId: 'b1', title: 'Multi-author', date: '2024-01-01', publishedAt: null,
      authors: [
        { title: 'Author One, MA' }, { title: 'Author Two, PhD' }, { title: 'Author Three, JD' },
      ],
      updatedAt: '2026-01-01T10:00:00.000Z',
    }]
    listPageMock.mockResolvedValueOnce(makePagedResult(threeAuthors))
    const wrapper = await mountSuspended(ContentList, { props: { type: 'article' } })
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.text()).toContain('+1 more')
  })
})
