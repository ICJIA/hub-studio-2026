import { describe, it, expect, vi } from 'vitest'
import { createLocalAnnotationStore, annotationsStorageKey, ANNOTATIONS_STORAGE_PREFIX } from '~/lib/annotations/store-local'
import type { ReviewAnnotation } from '~/types/annotations'

function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() { return m.size },
  } as Storage
}

const ann = (id: string): ReviewAnnotation => ({
  id, contentType: 'article', documentId: 'doc-1',
  anchor: { exact: 'quote', prefix: 'p', suffix: 's', offset: 10 },
  color: 'yellow', resolved: false, createdAt: '2026-07-04T00:00:00.000Z',
  createdBy: { name: 'Jane', email: 'jane@icjia.gov', roleLabel: 'Author' },
  comments: [{ id: 'c1', body: 'First note', authorName: 'Jane', authorEmail: 'jane@icjia.gov', createdAt: '2026-07-04T00:00:00.000Z' }],
})

describe('annotationsStorageKey', () => {
  it('is namespaced and versioned per content entry', () => {
    expect(annotationsStorageKey('article', 'doc-1')).toBe(`${ANNOTATIONS_STORAGE_PREFIX}:article:doc-1`)
  })
})

describe('createLocalAnnotationStore', () => {
  it('creates, lists (per key), and round-trips through JSON', async () => {
    const storage = memoryStorage()
    const store = createLocalAnnotationStore({ storage })
    await store.create(ann('a1'))
    await store.create({ ...ann('a2'), documentId: 'doc-2' })
    expect(await store.list('article', 'doc-1')).toEqual([ann('a1')])
    expect(storage.getItem(annotationsStorageKey('article', 'doc-1'))).toContain('"a1"')
  })
  it('addComment appends to the thread; setResolved flips; remove deletes', async () => {
    const store = createLocalAnnotationStore({ storage: memoryStorage() })
    await store.create(ann('a1'))
    const withReply = await store.addComment('a1', { id: 'c2', body: 'Reply', authorName: 'Ed', authorEmail: 'ed@icjia.gov', createdAt: '2026-07-04T01:00:00.000Z' })
    expect(withReply.comments.map((c) => c.id)).toEqual(['c1', 'c2'])
    expect((await store.setResolved('a1', true)).resolved).toBe(true)
    await store.remove('a1')
    expect(await store.list('article', 'doc-1')).toEqual([])
  })
  it('rejects unknown ids', async () => {
    const store = createLocalAnnotationStore({ storage: memoryStorage() })
    await expect(store.setResolved('nope', true)).rejects.toThrow('annotation not found')
  })
  it('ignores corrupt JSON (treats as empty)', async () => {
    const storage = memoryStorage()
    storage.setItem(annotationsStorageKey('article', 'doc-1'), '{not json')
    const store = createLocalAnnotationStore({ storage })
    expect(await store.list('article', 'doc-1')).toEqual([])
  })
  it('falls back to memory (and reports once) when storage throws', async () => {
    const onPersistFailure = vi.fn()
    const throwing = { getItem: () => { throw new Error('quota') }, setItem: () => { throw new Error('quota') } } as unknown as Storage
    const store = createLocalAnnotationStore({ storage: throwing, onPersistFailure })
    await store.create(ann('a1'))
    await store.create(ann('a2'))
    expect((await store.list('article', 'doc-1')).map((a) => a.id)).toEqual(['a1', 'a2'])
    expect(onPersistFailure).toHaveBeenCalledTimes(1)
  })
  it('storage: null reports the failure once on first use (not eagerly) and keeps working via memory', async () => {
    const onPersistFailure = vi.fn()
    const store = createLocalAnnotationStore({ storage: null, onPersistFailure })
    expect(onPersistFailure).not.toHaveBeenCalled() // not eager at construction
    await store.create(ann('a1'))
    expect(onPersistFailure).toHaveBeenCalledTimes(1)
    expect(await store.list('article', 'doc-1')).toEqual([ann('a1')])
    expect(onPersistFailure).toHaveBeenCalledTimes(1) // second op does not re-fire
  })
  it('a failed write does not blind reads to pre-existing persisted data under other keys', async () => {
    const seeded = memoryStorage()
    const a1 = ann('a1')
    seeded.setItem(annotationsStorageKey(a1.contentType, a1.documentId), JSON.stringify([a1]))
    const wrapper = {
      getItem: (k: string) => seeded.getItem(k),
      setItem: () => { throw new Error('quota') },
      removeItem: (k: string) => seeded.removeItem(k),
      clear: () => seeded.clear(),
      key: (i: number) => seeded.key(i),
      get length() { return seeded.length },
    } as unknown as Storage
    const onPersistFailure = vi.fn()
    const store = createLocalAnnotationStore({ storage: wrapper, onPersistFailure })
    const b1 = { ...ann('b1'), documentId: 'doc-2' }
    await store.create(b1) // setItem throws -> callback fires once
    expect(onPersistFailure).toHaveBeenCalledTimes(1)
    expect(await store.list('article', 'doc-1')).toEqual([a1]) // A never left storage; still readable
    expect((await store.setResolved('a1', true)).resolved).toBe(true) // locate finds it via storage scan
    expect(await store.list('article', 'doc-2')).toEqual([b1]) // B still readable from memory
    expect(onPersistFailure).toHaveBeenCalledTimes(1) // no additional re-fires
  })
  it('ignores corrupt JSON without treating it as a persist failure', async () => {
    const storage = memoryStorage()
    storage.setItem(annotationsStorageKey('article', 'doc-1'), '{not json')
    const onPersistFailure = vi.fn()
    const store = createLocalAnnotationStore({ storage, onPersistFailure })
    expect(await store.list('article', 'doc-1')).toEqual([])
    expect(onPersistFailure).not.toHaveBeenCalled()
  })
  it('list() returns a copy — the caller mutating the result does not corrupt a later list() (memory-backed store)', async () => {
    // storage: null forces every read() through the noStorage branch, which (pre-fix)
    // returned the live `memory` array reference instead of a copy.
    const store = createLocalAnnotationStore({ storage: null })
    await store.create(ann('a1'))
    const first = await store.list('article', 'doc-1')
    expect(first).toHaveLength(1)
    first.push(ann('a2')) // caller mutates the array it was handed
    const second = await store.list('article', 'doc-1')
    expect(second).toHaveLength(1) // unaffected — read() must not hand back the live array
  })
})
