// app/lib/demo-repository.ts
// In-memory Repository<T> for the dev demo session. Clones its seed array and
// NEVER calls $api — every operation is synchronous memory mutation wrapped in
// a resolved Promise so it satisfies the async Repository<T> interface.
// Resets on page reload (nothing is persisted — "saving disabled" contract).
import type { Repository, ListOptions, PagedResult } from '~/lib/repository'

let _counter = 0

export function makeDemoRepository<T extends {
  documentId: string
  updatedAt?: string | null
  publishedAt?: string | null
}>(seed: T[]): Repository<T> {
  // Deep clone so the original seed is never mutated (each composable call gets a fresh store)
  const store: T[] = seed.map((item) => ({ ...item }))

  function applyFilter(opts: ListOptions = {}): T[] {
    let items = [...store]

    // Status filter
    if (opts.status === 'published') {
      items = items.filter((item) => item.publishedAt != null)
    } else if (opts.status === 'draft') {
      items = items.filter((item) => item.publishedAt == null)
    }
    // undefined status → return ALL

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

    async remove(documentId) {
      const idx = store.findIndex((i) => i.documentId === documentId)
      if (idx === -1) throw new Error(`Demo: item not found: ${documentId}`)
      store.splice(idx, 1)
    },
  }
}
