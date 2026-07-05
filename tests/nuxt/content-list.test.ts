// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { PagedResult } from '~/lib/repository'

const DRAFT_ITEMS = [
  { documentId: 'a1', title: 'First Draft', date: '2024-03-15', publishedAt: null, type: 'researchReport', authors: [{ title: 'Alice Smith, MA' }], updatedAt: '2026-01-02T10:00:00.000Z' },
  { documentId: 'a2', title: 'Second Draft', date: '2024-01-10', publishedAt: null, type: 'annualReport', authors: [{ title: 'Bob Jones, PhD' }, { title: 'Carol White, MA' }], updatedAt: '2026-01-01T10:00:00.000Z' },
]

const PUBLISHED_ITEM = {
  documentId: 'a3', title: 'Published Article', date: '2023-11-01', publishedAt: '2024-01-01T12:00:00.000Z', type: 'article', authors: [{ title: 'Dan Green, JD' }], updatedAt: '2026-01-03T10:00:00.000Z'
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

// Apps repo: used by the "non-article list has no Type filter" test. Returns an empty page so the
// component renders its empty state (no Strapi $api needed in the test env).
const appsListPageMock = vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25, pageCount: 1 })
mockNuxtImport('useApps', () => () => ({
  list: vi.fn().mockResolvedValue([]),
  listPage: appsListPageMock,
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

  // ── Article TYPE: chip + filter dropdown ────────────────────────────────────

  it('renders a humanized Type chip for each article', async () => {
    listPageMock.mockResolvedValueOnce(makePagedResult(DRAFT_ITEMS))
    const wrapper = await mountSuspended(ContentList, { props: { type: 'article', status: 'draft' } })
    await new Promise((r) => setTimeout(r, 0))
    // Stored enums 'researchReport' / 'annualReport' shown as sentence case.
    expect(wrapper.text()).toContain('Research report')
    expect(wrapper.text()).toContain('Annual report')
  })

  it('shows the Type filter dropdown with "All types" for articles', async () => {
    const wrapper = await mountSuspended(ContentList, { props: { type: 'article' } })
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('#content-list-type-filter').exists()).toBe(true)
    expect(wrapper.text()).toContain('All types')
  })

  it('passes type=undefined to listPage on first load (All types)', async () => {
    listPageMock.mockClear()
    await mountSuspended(ContentList, { props: { type: 'article' } })
    await new Promise((r) => setTimeout(r, 0))
    expect(listPageMock).toHaveBeenCalledWith(expect.objectContaining({ type: undefined }))
  })

  it('selecting a type re-queries listPage with that type and refetches', async () => {
    listPageMock.mockResolvedValue(makePagedResult(DRAFT_ITEMS))
    const wrapper = await mountSuspended(ContentList, { props: { type: 'article' } })
    await new Promise((r) => setTimeout(r, 0))
    listPageMock.mockClear()

    // Drive the v-model the way the USelect would: emit update:modelValue from the select component.
    const select = wrapper.findComponent({ name: 'USelect' })
    select.vm.$emit('update:modelValue', 'researchReport')
    await new Promise((r) => setTimeout(r, 0))

    expect(listPageMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'researchReport', page: 1 }))
  })

  it('does NOT render the Type filter for non-article lists (apps)', async () => {
    const wrapper = await mountSuspended(ContentList, { props: { type: 'app' } })
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('#content-list-type-filter').exists()).toBe(false)
  })
})

describe('ContentList — card view (visual default) vs list toggle', () => {
  const VIEW_KEY = 'icjia-studio-content-view-v1'
  const CARD_ITEM = {
    documentId: 'c1', title: 'Card Article', date: '2024-05-01', publishedAt: '2024-06-01T00:00:00.000Z',
    type: 'researchReport', authors: [{ title: 'Ada Author, PhD' }],
    splash: { url: '/images/gavel.jpg' },
    abstract: 'Plain **bold** abstract with a [link](https://x.gov) inside.',
    updatedAt: '2026-01-01T10:00:00.000Z',
  }
  beforeEach(() => window.localStorage.removeItem(VIEW_KEY))

  it('defaults to CARDS: splash image, on-image status badge, clean excerpt — and no table', async () => {
    listPageMock.mockResolvedValueOnce(makePagedResult([CARD_ITEM]))
    const wrapper = await mountSuspended(ContentList, { props: { type: 'article' } })
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('[data-test="content-cards"]').exists()).toBe(true)
    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.find('img').attributes('src')).toBe('/images/gavel.jpg')
    expect(wrapper.text()).toContain('Plain bold abstract with a link inside.') // markdown stripped
    expect(wrapper.text()).toContain('Published')
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain('/edit/article/c1')
    expect(hrefs).toContain('/preview/article/c1')
  })

  it('toggles to LIST, persists the choice, and remounts in list mode from storage', async () => {
    listPageMock.mockResolvedValue(makePagedResult(DRAFT_ITEMS))
    const wrapper = await mountSuspended(ContentList, { props: { type: 'article' } })
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.find('[data-test="view-list"]').trigger('click')
    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.find('[data-test="content-cards"]').exists()).toBe(false)
    expect(window.localStorage.getItem(VIEW_KEY)).toBe('list')
    expect(wrapper.find('[data-test="view-list"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('[data-test="view-cards"]').attributes('aria-pressed')).toBe('false')

    const remount = await mountSuspended(ContentList, { props: { type: 'article' } })
    await new Promise((r) => setTimeout(r, 0))
    expect(remount.find('table').exists()).toBe(true)
  })

  it('cards carry the row-actions slot (publish toggle parity with the table)', async () => {
    listPageMock.mockResolvedValueOnce(makePagedResult([CARD_ITEM]))
    const wrapper = await mountSuspended(ContentList, {
      props: { type: 'article' },
      slots: { 'row-actions': '<span data-test="slot-probe">SLOT-TOOL</span>' },
    })
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('[data-test="content-cards"] [data-test="slot-probe"]').exists()).toBe(true)
  })

  it('cards without an image render the neutral placeholder block', async () => {
    listPageMock.mockResolvedValueOnce(makePagedResult([{ ...CARD_ITEM, documentId: 'c2', splash: null }]))
    const wrapper = await mountSuspended(ContentList, { props: { type: 'article' } })
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('[data-test="card-image-placeholder"]').exists()).toBe(true)
  })
})
