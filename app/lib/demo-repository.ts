// app/lib/demo-repository.ts
// In-memory Repository<T> for the dev/demo session. Backed by a MODULE-LEVEL store keyed by
// content type, so every makeDemoRepository(seed, key) call in a session shares ONE store: a
// publish/unpublish/create/update/remove persists for the WHOLE session (the lists update live).
// A full page reload re-imports this module → the `stores` Map is recreated → state resets to the
// seed ("saving disabled" contract — nothing is persisted to cookie/localStorage). NEVER calls
// $api and NEVER mutates the imported DEMO_* seed arrays.
//
// Cross-tab session copy: the Studio's Live preview opens a SEPARATE tab (its own JS context,
// its own module-level `stores`), so without help it would re-seed and never see this session's
// saved edits — in live builds both tabs read the same Strapi server, and the demo must simulate
// that. Every tab exposes its LIVE `stores` map on window; a fresh tab bootstraps a key by
// structuredClone-copying that key's array from its OPENER Studio tab (all studio-preview links
// carry rel="opener"). Same-origin only, guarded, and still session-only: close the tabs and
// it's gone; reload the editor tab and everything reseeds exactly as before.
import type { Repository, ListOptions, PagedResult } from '~/lib/repository'

let _counter = 0

// Session-scoped shared stores, keyed by content type ('articles' | 'apps' | 'datasets').
// Module-level ⇒ shared across every composable call in the session, and reset on a full reload
// (module re-import). Each value is a deep clone of the seed (so the seed is never mutated).
const stores = new Map<string, unknown[]>()

declare global {
  interface Window {
    /** This demo tab's LIVE session stores — read by tabs it opens (Live preview). */
    __icjiaStudioDemoStores?: Map<string, unknown[]>
  }
}

/** Deep, PLAIN clone for every store boundary. JSON round-trip ON PURPOSE, not structuredClone:
 *  create()/update() receive the LIVE form model whose nested values are Vue reactive PROXIES,
 *  and the cross-tab bootstrap reads arrays from ANOTHER realm — structuredClone throws
 *  DataCloneError on any proxy (browser-verified), while JSON serialization unwraps proxies and
 *  realms alike. Domain models are JSON-shaped by construction (they round-trip Strapi REST and
 *  the draft-backup snapshots the same way), so nothing is lost. */
function plainClone<V>(value: V): V {
  return JSON.parse(JSON.stringify(value)) as V
}

/** The opener Studio tab's exposed session stores, when reachable. Duck-typed rather than
 *  `instanceof Map` (the opener's Map constructor belongs to ANOTHER realm), and try/caught:
 *  a cross-origin opener throws on property access, and a closed opener yields nothing. */
function openerSessionStores(): Map<string, unknown[]> | null {
  try {
    if (typeof window === 'undefined') return null
    const maybe = (window.opener as Window | null)?.__icjiaStudioDemoStores
    return maybe && typeof maybe.get === 'function' && typeof maybe.has === 'function' ? maybe : null
  } catch {
    return null
  }
}

export function makeDemoRepository<T extends {
  documentId: string
  updatedAt?: string | null
  publishedAt?: string | null
}>(seed: T[], key: string): Repository<T> {
  // First call for this key: bootstrap the shared map entry — from the OPENER Studio tab's live
  // session store when there is one (the Live-preview tab picking up this session's saved edits),
  // else a deep clone of the seed. Both paths clone (NEVER mutate the seed, never share an array
  // across tabs — a preview-tab mutation must not write back into the editor tab's store).
  // Subsequent calls for the same key reuse the SAME array reference, so mutations made through
  // one composable instance are visible to every other instance for the rest of the session.
  if (!stores.has(key)) {
    const opener = openerSessionStores()
    const fromOpener = opener?.has(key) ? opener.get(key)! : null
    stores.set(key, plainClone(fromOpener ?? seed))
  }
  // Expose the LIVE map for tabs this one opens (session-only; recreated on reload). Client only —
  // `window` does not exist during unit runs in node and this file is demo-session-only anyway.
  if (typeof window !== 'undefined') {
    window.__icjiaStudioDemoStores = stores
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
      // Deep-plain copy, not a shallow spread: the edit form wraps this in reactive() — shared
      // NESTED objects would let live typing silently mutate the "saved" store entry.
      return plainClone(item)
    },

    // Edit-conflict check (see ~/lib/edit-conflict's hasConflict): the store already stamps
    // every item on create/update/publish/unpublish, so this is a plain read — unknown id →
    // null (mirrors the live repo's fail-open contract; unlike findOne, never throws).
    async getUpdatedAt(documentId) {
      const item = store.find((i) => i.documentId === documentId)
      return item?.updatedAt ?? null
    },

    async create(model) {
      const id = `demo-new-${++_counter}`
      const now = new Date().toISOString()
      // plainClone: `model` is the LIVE reactive form model — the store must hold a detached,
      // proxy-free snapshot (see plainClone's doc comment; proxies also break the cross-tab copy).
      const item: T = plainClone({ ...model, documentId: id, updatedAt: now } as T)
      store.unshift(item)
      return plainClone(item)
    },

    async update(documentId, model) {
      const idx = store.findIndex((i) => i.documentId === documentId)
      if (idx === -1) throw new Error(`Demo: item not found: ${documentId}`)
      const now = new Date().toISOString()
      const item: T = plainClone({ ...model, documentId, updatedAt: now } as T)
      store[idx] = item
      return plainClone(item)
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
