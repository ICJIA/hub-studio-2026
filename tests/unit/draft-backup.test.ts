import { describe, it, expect, vi } from 'vitest'
import {
  backupKey, saveSnapshot, loadSnapshot, clearSnapshot,
  DRAFT_BACKUP_MAX_BYTES, type BackupStore,
} from '~/lib/draft-backup'

/** Tiny in-memory BackupStore (the unit env has no localStorage). */
function memoryStore(): BackupStore & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v) },
    removeItem: (k) => { map.delete(k) },
  }
}

const model = { title: 'Draft title', markdown: '# Body', tags: ['a'] }

describe('backupKey', () => {
  it('keys per type + documentId, with "new" for null', () => {
    expect(backupKey('article', 'abc123')).toBe('icjia-studio-draft-backup:article:abc123')
    expect(backupKey('dataset', null)).toBe('icjia-studio-draft-backup:dataset:new')
  })
})

describe('saveSnapshot / loadSnapshot round trip', () => {
  it('stores and restores the model with its envelope', () => {
    const store = memoryStore()
    expect(saveSnapshot('article', 'abc123', model, '2026-07-16T14:41:00.000Z', store)).toBe(true)
    const snap = loadSnapshot<typeof model>('article', 'abc123', store)
    expect(snap).not.toBeNull()
    expect(snap!.model).toEqual(model)
    expect(snap!.savedAt).toBe('2026-07-16T14:41:00.000Z')
    expect(snap!.type).toBe('article')
    expect(snap!.documentId).toBe('abc123')
  })

  it('create-mode drafts key under "new" and do not collide with edit drafts', () => {
    const store = memoryStore()
    saveSnapshot('article', null, { ...model, title: 'New draft' }, '2026-07-16T10:00:00.000Z', store)
    saveSnapshot('article', 'abc123', model, '2026-07-16T11:00:00.000Z', store)
    expect(loadSnapshot<typeof model>('article', null, store)!.model.title).toBe('New draft')
    expect(loadSnapshot<typeof model>('article', 'abc123', store)!.model.title).toBe('Draft title')
  })

  it('returns null for a missing snapshot and for corrupt JSON', () => {
    const store = memoryStore()
    expect(loadSnapshot('article', 'nope', store)).toBeNull()
    store.setItem(backupKey('article', 'bad'), '{not json')
    expect(loadSnapshot('article', 'bad', store)).toBeNull()
  })

  it('returns null for a wrong-shaped envelope (no model)', () => {
    const store = memoryStore()
    store.setItem(backupKey('article', 'shape'), JSON.stringify({ savedAt: 'x' }))
    expect(loadSnapshot('article', 'shape', store)).toBeNull()
  })
})

describe('fail-open guards', () => {
  it('skips oversized models (returns false, no write, warns once)', () => {
    const store = memoryStore()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const huge = { markdown: 'x'.repeat(DRAFT_BACKUP_MAX_BYTES) }
    expect(saveSnapshot('article', 'big', huge, '2026-07-16T10:00:00.000Z', store)).toBe(false)
    expect(store.map.size).toBe(0)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('a throwing store (quota) is swallowed — returns false, never throws', () => {
    const store: BackupStore = {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceededError') },
      removeItem: () => {},
    }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(saveSnapshot('article', 'q', model, '2026-07-16T10:00:00.000Z', store)).toBe(false)
    warn.mockRestore()
  })

  it('a null store (no localStorage) is a no-op everywhere', () => {
    expect(saveSnapshot('article', 'x', model, '2026-07-16T10:00:00.000Z', null)).toBe(false)
    expect(loadSnapshot('article', 'x', null)).toBeNull()
    expect(() => clearSnapshot('article', 'x', null)).not.toThrow()
  })
})

describe('clearSnapshot', () => {
  it('removes exactly the draft key', () => {
    const store = memoryStore()
    saveSnapshot('article', 'abc123', model, '2026-07-16T10:00:00.000Z', store)
    saveSnapshot('app', 'abc123', model, '2026-07-16T10:00:00.000Z', store)
    clearSnapshot('article', 'abc123', store)
    expect(loadSnapshot('article', 'abc123', store)).toBeNull()
    expect(loadSnapshot('app', 'abc123', store)).not.toBeNull()
  })

  it('swallows a throwing removeItem — no throw', () => {
    const store: BackupStore = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => { throw new Error('access denied') },
    }
    expect(() => clearSnapshot('article', 'x', store)).not.toThrow()
  })
})

describe('byte-size guard (TextEncoder)', () => {
  it('measures true byte length, not UTF-16 code units (rejects multibyte overage)', () => {
    const store = memoryStore()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Each em-dash (—) is 1 UTF-16 code unit but 3 bytes in UTF-8.
    // Build a model that when serialized exceeds 1MB in bytes.
    // Aim for ~335k em-dashes: 335k * 3 bytes = 1,005,000 bytes
    const emDashCount = 335_000
    const hugeModel = { markdown: '—'.repeat(emDashCount) }
    const serialized = JSON.stringify({ model: hugeModel, savedAt: 'x', type: 't', documentId: 'x' })
    const byteLength = new TextEncoder().encode(serialized).length
    const charLength = serialized.length

    // Verify our test setup: byte length exceeds cap
    expect(byteLength).toBeGreaterThan(DRAFT_BACKUP_MAX_BYTES)

    expect(saveSnapshot('article', 'big', hugeModel, '2026-07-16T10:00:00.000Z', store)).toBe(false)
    expect(store.map.size).toBe(0) // Nothing written
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('untested fail-open paths', () => {
  it('loadSnapshot: throwing getItem is swallowed — returns null, no throw', () => {
    const store: BackupStore = {
      getItem: () => { throw new Error('access denied') },
      setItem: () => {},
      removeItem: () => {},
    }
    expect(loadSnapshot('article', 'x', store)).toBeNull()
  })

  it('saveSnapshot: non-serializable model (circular ref) returns false, warns, no throw', () => {
    const store = memoryStore()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const circular: any = { data: 'x' }
    circular.self = circular // circular reference
    expect(saveSnapshot('article', 'c', circular, '2026-07-16T10:00:00.000Z', store)).toBe(false)
    expect(store.map.size).toBe(0)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('defaultStore() privacy-mode guard: localStorage access throws → returns false, no throw', () => {
    // Stub globalThis.localStorage to throw on access
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', {
      get() { throw new Error('localStorage access denied') },
      configurable: true,
    })

    try {
      // Call saveSnapshot without passing store argument; it should call defaultStore()
      // which catches the throw and returns null, then returns false (no warning for absent store)
      expect(saveSnapshot('article', 'x', model, '2026-07-16T10:00:00.000Z')).toBe(false)
      // Also test loadSnapshot and clearSnapshot for completeness
      expect(loadSnapshot('article', 'x')).toBeNull()
      expect(() => clearSnapshot('article', 'x')).not.toThrow()
    } finally {
      // Restore
      if (original) {
        Object.defineProperty(globalThis, 'localStorage', original)
      } else {
        delete (globalThis as any).localStorage
      }
    }
  })
})

describe('shape validation', () => {
  it('rejects envelope missing type field', () => {
    const store = memoryStore()
    store.setItem(backupKey('article', 'bad'), JSON.stringify({ model: { x: 1 }, savedAt: 'x', documentId: 'x' }))
    expect(loadSnapshot('article', 'bad', store)).toBeNull()
  })

  it('rejects envelope missing documentId field', () => {
    const store = memoryStore()
    store.setItem(backupKey('article', 'bad'), JSON.stringify({ model: { x: 1 }, savedAt: 'x', type: 'article' }))
    expect(loadSnapshot('article', 'bad', store)).toBeNull()
  })

  it('rejects envelope with non-string type', () => {
    const store = memoryStore()
    store.setItem(backupKey('article', 'bad'), JSON.stringify({ model: { x: 1 }, savedAt: 'x', type: 123, documentId: 'x' }))
    expect(loadSnapshot('article', 'bad', store)).toBeNull()
  })

  it('rejects envelope with non-string documentId', () => {
    const store = memoryStore()
    store.setItem(backupKey('article', 'bad'), JSON.stringify({ model: { x: 1 }, savedAt: 'x', type: 'article', documentId: 123 }))
    expect(loadSnapshot('article', 'bad', store)).toBeNull()
  })
})
