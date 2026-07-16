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
})
