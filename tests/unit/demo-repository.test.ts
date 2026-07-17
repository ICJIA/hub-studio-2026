// tests/unit/demo-repository.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
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

  it('getUpdatedAt returns the stored item\'s stamp (edit-conflict check)', async () => {
    const repo = makeDemoRepository([...seed], 'k-getupdatedat')
    const stamp = await repo.getUpdatedAt('test-5')
    expect(stamp).toBe('2026-01-06T10:00:00.000Z') // makeItem(5, ...) → i+1 = 6
  })

  it('getUpdatedAt returns null for an unknown documentId (no throw)', async () => {
    const repo = makeDemoRepository([...seed], 'k-getupdatedat-miss')
    await expect(repo.getUpdatedAt('nope')).resolves.toBeNull()
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

// ── Cross-tab session copy (opener bootstrap) ────────────────────────────────
// The Live-preview tab is a SEPARATE JS context: without this, its module-level store
// re-seeds from the bundled demo content and the editor tab's saved changes (splash
// replacements included) are invisible in the preview. A fresh tab therefore bootstraps
// its store for a key by COPYING that key's array from the opener Studio tab's exposed
// session stores (same-origin only; session-only — nothing is persisted anywhere).
describe('cross-tab session copy (opener bootstrap)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /** A window stub whose opener exposes `map` the way a live Studio tab does. */
  function stubWindowWithOpener(map: Map<string, unknown[]> | null) {
    vi.stubGlobal('window', { opener: map ? { __icjiaStudioDemoStores: map } : null })
  }

  it("bootstraps a new tab's store from the opener tab's session store, not the seed", async () => {
    const openerItem = { ...makeItem(0, true), documentId: 'test-0', title: 'Edited in opener tab' }
    const openerMap = new Map<string, unknown[]>([['k-opener-copy', [openerItem]]])
    stubWindowWithOpener(openerMap)

    const repo = makeDemoRepository([...seed], 'k-opener-copy')
    const item = await repo.findOne('test-0')
    expect(item.title).toBe('Edited in opener tab') // the opener's state, not the seed's 'Article 0'
    expect((await repo.listPage({ page: 1, pageSize: 100 })).total).toBe(1) // opener array, whole
  })

  it('copies a snapshot: mutations in this tab do not leak back into the opener store', async () => {
    const openerItem = { ...makeItem(0, true), documentId: 'test-0', title: 'Opener title' }
    const openerArray = [openerItem]
    const openerMap = new Map<string, unknown[]>([['k-opener-detach', openerArray]])
    stubWindowWithOpener(openerMap)

    const repo = makeDemoRepository([...seed], 'k-opener-detach')
    const item = await repo.findOne('test-0')
    await repo.update('test-0', { ...item, title: 'Changed in preview tab' })
    expect(openerItem.title).toBe('Opener title') // the opener's own array is untouched
  })

  it('exposes this tab\'s LIVE stores on window so tabs it opens can copy current state', async () => {
    vi.stubGlobal('window', { opener: null })
    const repo = makeDemoRepository([...seed], 'k-expose')
    const exposed = (window as unknown as { __icjiaStudioDemoStores?: Map<string, unknown[]> })
      .__icjiaStudioDemoStores
    expect(exposed?.has('k-expose')).toBe(true)
    // Live, not a copy: a later mutation through the repo is visible in the exposed array.
    const item = await repo.findOne('test-3')
    await repo.update('test-3', { ...item, title: 'Visible to opened tabs' })
    const arr = exposed!.get('k-expose') as Article[]
    expect(arr.find((i) => i.documentId === 'test-3')?.title).toBe('Visible to opened tabs')
  })

  it('falls back to the seed when the opener map lacks the key', async () => {
    stubWindowWithOpener(new Map([['some-other-key', []]]))
    const repo = makeDemoRepository([...seed], 'k-opener-misskey')
    expect((await repo.listPage({ page: 1, pageSize: 100 })).total).toBe(30)
  })

  it('falls back to the seed when reading the opener throws (cross-origin opener)', async () => {
    const hostileOpener = new Proxy({}, {
      get() { throw new DOMException('Blocked a frame from accessing a cross-origin frame.', 'SecurityError') },
    })
    vi.stubGlobal('window', { opener: hostileOpener })
    const repo = makeDemoRepository([...seed], 'k-opener-hostile')
    expect((await repo.listPage({ page: 1, pageSize: 100 })).total).toBe(30)
  })

  it('copies an opener store whose entries are reactive PROXIES (structuredClone would throw)', async () => {
    // The editor tab's store holds the saved form model — in the real app its nested values are
    // Vue reactive proxies, and window.structuredClone throws DataCloneError on ANY proxy
    // (browser-verified failure: "Failed to execute 'structuredClone' on 'Window'"). The copy
    // must deep-PLAIN-clone instead.
    const proxied = new Proxy({ ...makeItem(0, true), documentId: 'test-0', title: 'Proxied opener entry' }, {})
    const openerMap = new Map<string, unknown[]>([['k-opener-proxy', [proxied]]])
    stubWindowWithOpener(openerMap)

    const repo = makeDemoRepository([...seed], 'k-opener-proxy')
    expect((await repo.findOne('test-0')).title).toBe('Proxied opener entry')
  })
})

// ── Store snapshots are deep and PLAIN (no live references into or out of the store) ─────────
// update()/create() receive the LIVE (reactive) form model; findOne() feeds edit forms. A
// shallow spread shares every NESTED object with the caller — later form edits would silently
// mutate the "saved" store entry (and proxies in the store break the cross-tab copy above).
describe('store snapshots are deep and plain', () => {
  it('update() detaches nested objects: mutating the saved-from model afterwards does not change the store', async () => {
    const repo = makeDemoRepository([...seed], 'k-plain-update')
    const model = await repo.findOne('test-1')
    model.authors = [{ title: 'Original Author', description: 'bio' }]
    await repo.update('test-1', model)
    model.authors[0]!.title = 'Edited AFTER save — must not leak'
    expect((await repo.findOne('test-1')).authors[0]!.title).toBe('Original Author')
  })

  it('create() detaches nested objects the same way', async () => {
    const repo = makeDemoRepository([...seed], 'k-plain-create')
    const model = makeItem(80, false)
    model.authors = [{ title: 'Creator', description: 'bio' }]
    const created = await repo.create(model)
    model.authors[0]!.title = 'Edited AFTER create — must not leak'
    expect((await repo.findOne(created.documentId)).authors[0]!.title).toBe('Creator')
  })

  it('findOne() returns a detached copy: mutating its nested objects does not change the store', async () => {
    const repo = makeDemoRepository([...seed], 'k-plain-findone')
    const first = await repo.findOne('test-2')
    first.authors = [{ title: 'Stored Author', description: 'bio' }]
    await repo.update('test-2', first)
    const loaded = await repo.findOne('test-2')
    loaded.authors[0]!.title = 'Mutated on the loaded copy'
    expect((await repo.findOne('test-2')).authors[0]!.title).toBe('Stored Author')
  })
})

describe('title search', () => {
  it('filters case-insensitively by title contains, across the whole set before paging', async () => {
    // 60 items; every 12th title contains "Police" in mixed case (i = 0,12,24,36,48 → 5 matches),
    // scattered well beyond a pageSize:5 first page — mirrors the type-filter whole-set test.
    const titled = Array.from({ length: 60 }, (_, i) => {
      const item = makeItem(i, true)
      item.title = i % 12 === 0 ? `${i} Police Report` : `Article ${i}`
      return item
    })
    const repo = makeDemoRepository(titled, 'k-search-pages')
    const result = await repo.listPage({ search: 'POLICE', page: 1, pageSize: 5 })
    // All 5 matches found across the whole set (not just an unfiltered first page of 5).
    expect(result.total).toBe(5)
    expect(result.items.length).toBe(5)
    expect(result.items.every((i) => i.title.toLowerCase().includes('police'))).toBe(true)
  })

  it('composes with type and status filters', async () => {
    // 8 items: i<4 published else draft; even i → researchReport else article; only i=0's title
    // contains "Police". Type+status ALONE would match i=0 AND i=2 — search must narrow to i=0
    // only, so this fails if search is silently ignored (proves real composition, not a vacuous
    // pass).
    const mixed = Array.from({ length: 8 }, (_, i) => {
      const item = makeItem(i, i < 4)
      item.type = i % 2 === 0 ? 'researchReport' : 'article'
      item.title = i === 0 ? 'Police Report' : `Article ${i}`
      return item
    })
    const repo = makeDemoRepository(mixed, 'k-search-compose')
    const result = await repo.listPage({
      search: 'police', type: 'researchReport', status: 'published', page: 1, pageSize: 25,
    })
    expect(result.total).toBe(1)
    expect(result.items[0]!.documentId).toBe('test-0')
  })

  it('empty/whitespace search applies no filter', async () => {
    const repo = makeDemoRepository([...seed], 'k-search-empty')
    const none = await repo.listPage({ page: 1, pageSize: 100 })
    const empty = await repo.listPage({ search: '', page: 1, pageSize: 100 })
    const whitespace = await repo.listPage({ search: '   ', page: 1, pageSize: 100 })
    expect(none.total).toBe(30)
    expect(empty.total).toBe(30)
    expect(whitespace.total).toBe(30)
  })
})
