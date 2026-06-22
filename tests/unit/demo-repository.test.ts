// tests/unit/demo-repository.test.ts
import { describe, it, expect } from 'vitest'
import { makeDemoRepository } from '~/lib/demo-repository'
import type { Article } from '~/types/content'

function makeItem(i: number, published: boolean): Article & { updatedAt: string } {
  return {
    documentId: `test-${i}`,
    title: `Article ${i}`,
    slug: `article-${i}`,
    date: '2024-01-01',
    external: false,
    categories: [],
    tags: [],
    citation: null,
    funding: null,
    publishedAt: published ? '2024-01-10T12:00:00.000Z' : null,
    type: 'article',
    hideFromBanner: false,
    authors: [],
    abstract: null,
    markdown: '',
    splash: null,
    thumbnail: null,
    images: [],
    mainfiletype: null,
    mainfiles: [],
    extrafile: null,
    doi: null,
    apps: [],
    datasets: [],
    updatedAt: `2026-01-${String(i + 1).padStart(2, '0')}T10:00:00.000Z`,
  }
}

// 30 items: indices 0–19 published, 20–29 draft
const seed = Array.from({ length: 30 }, (_, i) => makeItem(i, i < 20))

// The store is a MODULE-LEVEL singleton keyed by the second arg, so each test below uses its OWN
// unique key to stay isolated; the shared-store / isolation tests deliberately reuse / vary the key.

describe('makeDemoRepository', () => {
  it('listPage returns correct total and pageCount', async () => {
    const repo = makeDemoRepository([...seed], 'k-total')
    const result = await repo.listPage({ page: 1, pageSize: 10 })
    expect(result.total).toBe(30)
    expect(result.pageCount).toBe(3)
    expect(result.items.length).toBe(10)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(10)
  })

  it('listPage returns correct slice for page 2', async () => {
    const repo = makeDemoRepository([...seed], 'k-page2')
    const p2 = await repo.listPage({ page: 2, pageSize: 10 })
    expect(p2.items.length).toBe(10)
    expect(p2.page).toBe(2)
  })

  it('listPage filters published items only', async () => {
    const repo = makeDemoRepository([...seed], 'k-published')
    const result = await repo.listPage({ status: 'published', page: 1, pageSize: 25 })
    expect(result.total).toBe(20)
    expect(result.items.every((i) => i.publishedAt != null)).toBe(true)
  })

  it('listPage filters draft items only', async () => {
    const repo = makeDemoRepository([...seed], 'k-draft')
    const result = await repo.listPage({ status: 'draft', page: 1, pageSize: 25 })
    expect(result.total).toBe(10)
    expect(result.items.every((i) => i.publishedAt == null)).toBe(true)
  })

  it('listPage filters by type (only matching items; across all pages)', async () => {
    // Build a small mixed-type seed: 4 'researchReport', 3 'annualReport', the rest 'article'.
    const typed = Array.from({ length: 10 }, (_, i) => {
      const item = makeItem(i, true)
      item.type = i < 4 ? 'researchReport' : i < 7 ? 'annualReport' : 'article'
      return item
    })
    const repo = makeDemoRepository(typed, 'k-type')
    const research = await repo.listPage({ type: 'researchReport', page: 1, pageSize: 25 })
    expect(research.total).toBe(4)
    expect(research.items.every((i) => i.type === 'researchReport')).toBe(true)
    const annual = await repo.listPage({ type: 'annualReport', page: 1, pageSize: 25 })
    expect(annual.total).toBe(3)
    expect(annual.items.every((i) => i.type === 'annualReport')).toBe(true)
  })

  it('listPage with no type (or "all") returns every item, regardless of type', async () => {
    const typed = Array.from({ length: 6 }, (_, i) => {
      const item = makeItem(i, true)
      item.type = i % 2 === 0 ? 'researchReport' : 'article'
      return item
    })
    const repo = makeDemoRepository(typed, 'k-type-all')
    const all = await repo.listPage({ page: 1, pageSize: 25 })
    expect(all.total).toBe(6)
    // An unknown type yields nothing (proves the equality is exact, not a prefix/loose match).
    const none = await repo.listPage({ type: 'noSuchType', page: 1, pageSize: 25 })
    expect(none.total).toBe(0)
  })

  it('type filter spans all pages, then re-paginates (filter applied before slicing)', async () => {
    // 60 items, every one 'researchReport' except 5 scattered 'annualReport' (across page boundaries).
    const typed = Array.from({ length: 60 }, (_, i) => {
      const item = makeItem(i, true)
      item.type = i % 12 === 0 ? 'annualReport' : 'researchReport' // i = 0,12,24,36,48 → 5 items
      return item
    })
    const repo = makeDemoRepository(typed, 'k-type-pages')
    const annual = await repo.listPage({ type: 'annualReport', page: 1, pageSize: 25 })
    // All 5 matches found across the whole set (not just the first loaded page of 25).
    expect(annual.total).toBe(5)
    expect(annual.pageCount).toBe(1)
    expect(annual.items.length).toBe(5)
  })

  it('list() returns the first page of items', async () => {
    const repo = makeDemoRepository([...seed], 'k-list')
    const items = await repo.list({ page: 1, pageSize: 10 })
    expect(items.length).toBe(10)
  })

  it('findOne returns the correct item', async () => {
    const repo = makeDemoRepository([...seed], 'k-findone')
    const item = await repo.findOne('test-5')
    expect(item.documentId).toBe('test-5')
  })

  it('findOne throws for unknown documentId', async () => {
    const repo = makeDemoRepository([...seed], 'k-findmiss')
    await expect(repo.findOne('nope')).rejects.toThrow()
  })

  it('create adds an item in-memory without touching network', async () => {
    const repo = makeDemoRepository([...seed], 'k-create')
    const newItem = makeItem(99, false)
    const created = await repo.create(newItem)
    expect(created.documentId).toMatch(/^demo-new-/)
    const found = await repo.findOne(created.documentId)
    expect(found.title).toBe('Article 99')
  })

  it('update replaces the item in-memory', async () => {
    const repo = makeDemoRepository([...seed], 'k-update')
    const item = await repo.findOne('test-3')
    const updated = await repo.update('test-3', { ...item, title: 'Updated Title' })
    expect(updated.title).toBe('Updated Title')
    const refetched = await repo.findOne('test-3')
    expect(refetched.title).toBe('Updated Title')
  })

  it('publish sets publishedAt', async () => {
    const repo = makeDemoRepository([...seed], 'k-publish')
    const result = await repo.publish('test-22') // was draft
    expect(result.publishedAt).not.toBeNull()
  })

  it('unpublish clears publishedAt (published → draft)', async () => {
    const repo = makeDemoRepository([...seed], 'k-unpublish')
    const before = await repo.findOne('test-0') // was published
    expect(before.publishedAt).not.toBeNull()
    const result = await repo.unpublish('test-0')
    expect(result.publishedAt).toBeNull()
    const refetched = await repo.findOne('test-0')
    expect(refetched.publishedAt).toBeNull()
  })

  it('remove deletes the item', async () => {
    const repo = makeDemoRepository([...seed], 'k-remove')
    await repo.remove('test-0')
    await expect(repo.findOne('test-0')).rejects.toThrow()
  })

  it('sorts by updatedAt desc by default', async () => {
    const repo = makeDemoRepository([...seed], 'k-sort')
    const result = await repo.listPage({ page: 1, pageSize: 30 })
    const dates = result.items.map((i) => (i as { updatedAt?: string }).updatedAt ?? '')
    for (let j = 0; j < dates.length - 1; j++) {
      expect(dates[j]! >= dates[j + 1]!).toBe(true)
    }
  })

  // ── Shared session store (the bug fix) ────────────────────────────────────

  it('two repos with the SAME key share one session store (a publish via one is visible via the other)', async () => {
    const a = makeDemoRepository([...seed], 'k-shared')
    const b = makeDemoRepository([...seed], 'k-shared')
    expect((await b.findOne('test-25')).publishedAt).toBeNull() // draft to start
    await a.publish('test-25')
    // The mutation through `a` is visible through `b` because they share one store.
    expect((await b.findOne('test-25')).publishedAt).not.toBeNull()
  })

  it("a status:'published' list excludes a freshly unpublished item and includes a freshly published one", async () => {
    const repo = makeDemoRepository([...seed], 'k-toggle')
    await repo.unpublish('test-0') // was published → now draft
    await repo.publish('test-29')  // was draft → now published
    const pub = await repo.listPage({ status: 'published', page: 1, pageSize: 100 })
    const ids = pub.items.map((i) => i.documentId)
    expect(ids).not.toContain('test-0')
    expect(ids).toContain('test-29')
    // And the draft list mirrors the inverse.
    const drafts = await repo.listPage({ status: 'draft', page: 1, pageSize: 100 })
    const draftIds = drafts.items.map((i) => i.documentId)
    expect(draftIds).toContain('test-0')
    expect(draftIds).not.toContain('test-29')
  })

  it('different keys keep their stores isolated', async () => {
    const articles = makeDemoRepository([...seed], 'k-iso-articles')
    const apps = makeDemoRepository([...seed], 'k-iso-apps')
    await articles.publish('test-25')
    // The other store (different key) is unaffected.
    expect((await apps.findOne('test-25')).publishedAt).toBeNull()
  })
})
