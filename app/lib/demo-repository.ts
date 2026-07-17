// app/lib/demo-repository.ts
// In-memory Repository<T> for the dev/demo session. Backed by a MODULE-LEVEL store keyed by
// content type, so every makeDemoRepository(seed, key) call in a session shares ONE store: a
// publish/unpublish/create/update/remove persists for the WHOLE session (the lists update live).
// A full page reload re-imports this module → the `stores` Map is recreated → state resets to the
// seed ("saving disabled" contract — nothing is persisted to cookie/localStorage). NEVER calls
// $api and NEVER mutates the imported DEMO_* seed arrays.
import type { Repository, ListOptions, PagedResult } from '~/lib/repository'

let _counter = 0

// Session-scoped shared stores, keyed by content type ('articles' | 'apps' | 'datasets').
// Module-level ⇒ shared across every composable call in the session, and reset on a full reload
// (module re-import). Each value is a deep clone of the seed (so the seed is never mutated).
const stores = new Map<string, unknown[]>()

export function makeDemoRepository<T extends {
  documentId: string
  updatedAt?: string | null
  publishedAt?: string | null
}>(seed: T[], key: string): Repository<T> {
  // First call for this key: deep-clone the seed into the shared map (NEVER mutate the seed).
  // Subsequent calls for the same key reuse the SAME array reference, so mutations made through
  // one composable instance are visible to every other instance for the rest of the session.
  if (!stores.has(key)) {
    stores.set(key, structuredClone(seed))
  }
  const store = stores.get(key) as T[]

  function applyFilter(opts: ListOptions = {}): T[] {
    let items = [...store]

    // Status filter
    if (opts.status === 'published') {
      items = items.filter((item) => item.publishedAt != null)
    } else if (opts.status === 'draft') {
      items = items.filter((item) => item.publishedAt == null)
    }
    // undefined status → return ALL

    // Type filter (article `type` enum). Applied across ALL items here, before paging, so selecting
    // a type re-pages from 1 over the whole filtered set. Undefined/"All types" → no type filter.
    if (opts.type) {
      items = items.filter((item) => (item as Record<string, unknown>).type === opts.type)
    }

    // Title search (case-insensitive contains). Applied across ALL items before paging,
    // mirroring the live repo's filters[title][$containsi]. Empty/whitespace → no filter.
    const term = opts.search?.trim().toLowerCase()
    if (term) {
      items = items.filter((item) =>
        String((item as Record<string, unknown>).title ?? '').toLowerCase().includes(term),
      )
    }

    // Sort
    const sortStr = opts.sort ?? 'updatedAt:desc'
    const [field, dir] = sortStr.split(':') as [string, string]
    const asc = dir?.toLowerCase() !== 'desc'
    items.sort((a, b) => {
      const av = (a as Record<string, unknown>)[field] ?? ''
      const bv = (b as Record<string, unknown>)[field] ?? ''
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return asc ? cmp : -cmp
    })

    return items
  }

  async function listPage(opts: ListOptions = {}): Promise<PagedResult<T>> {
    const filtered = applyFilter(opts)
    const page = opts.page ?? 1
    const pageSize = opts.pageSize ?? 25
    const total = filtered.length
    const pageCount = Math.max(1, Math.ceil(total / pageSize))
    const start = (page - 1) * pageSize
    const items = filtered.slice(start, start + pageSize)
    return { items, total, page, pageSize, pageCount }
  }

  return {
    listPage,

    async list(opts = {}) {
      return (await listPage(opts)).items
    },

    async findOne(documentId) {
      const item = store.find((i) => i.documentId === documentId)
      if (!item) throw new Error(`Demo: item not found: ${documentId}`)
      return { ...item }
    },

    async create(model) {
      const id = `demo-new-${++_counter}`
      const now = new Date().toISOString()
      const item: T = { ...model, documentId: id, updatedAt: now } as T
      store.unshift(item)
      return { ...item }
    },

    async update(documentId, model) {
      const idx = store.findIndex((i) => i.documentId === documentId)
      if (idx === -1) throw new Error(`Demo: item not found: ${documentId}`)
      const now = new Date().toISOString()
      const item: T = { ...model, documentId, updatedAt: now } as T
      store[idx] = item
      return { ...item }
    },

    async publish(documentId) {
      const idx = store.findIndex((i) => i.documentId === documentId)
      if (idx === -1) throw new Error(`Demo: item not found: ${documentId}`)
      const now = new Date().toISOString()
      store[idx] = { ...store[idx]!, publishedAt: now, updatedAt: now }
      return { ...store[idx]! }
    },

    async unpublish(documentId) {
      const idx = store.findIndex((i) => i.documentId === documentId)
      if (idx === -1) throw new Error(`Demo: item not found: ${documentId}`)
      const now = new Date().toISOString()
      store[idx] = { ...store[idx]!, publishedAt: null, updatedAt: now }
      return { ...store[idx]! }
    },

    async remove(documentId) {
      const idx = store.findIndex((i) => i.documentId === documentId)
      if (idx === -1) throw new Error(`Demo: item not found: ${documentId}`)
      store.splice(idx, 1)
    },
  }
}
