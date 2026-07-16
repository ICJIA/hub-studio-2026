import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sampleImagePoolSize } from '~/lib/sample-images'
import { sampleFigurePoolSize } from '~/lib/sample-figures'
import { mediaIdForWrite, mediaIdsForWrite } from '~/lib/strapi-rest'

const SEED_COUNT = sampleImagePoolSize() + sampleFigurePoolSize()

// The store is module-level (reset on re-import, mirroring demo-repository's contract),
// so every test gets a fresh module instance.
beforeEach(() => {
  vi.resetModules()
})

async function freshLib(deps?: { createObjectUrl?: (f: File | Blob) => string }) {
  const mod = await import('~/lib/demo-media-library')
  return mod.makeDemoMediaLibrary(deps)
}

describe('makeDemoMediaLibrary — seed', () => {
  it('seeds every bundled photo and figure, newest-first, with unique negative ids', async () => {
    const lib = await freshLib()
    const all = await lib.list({ pageSize: 100 })
    expect(all).toHaveLength(SEED_COUNT)
    const ids = all.map((m) => m.id)
    expect(new Set(ids).size).toBe(SEED_COUNT)
    expect(ids.every((id) => id < 0)).toBe(true)
    // Deterministic: a second fresh module seeds the identical list.
    vi.resetModules()
    const again = await (await freshLib()).list({ pageSize: 100 })
    expect(again).toEqual(all)
  })

  it('seeded photos carry humanized alt text derived from the filename', async () => {
    const lib = await freshLib()
    const all = await lib.list({ pageSize: 100 })
    const photo = all.find((m) => m.mime === 'image/jpeg')!
    expect(photo.alternativeText).toBeTruthy()
    expect(photo.alternativeText).not.toMatch(/_/) // underscores humanized away
    expect(photo.alternativeText).not.toMatch(/^medium|^small|^large/i) // size prefix stripped
  })

  it('pages by 20 by default and reports the tail page short', async () => {
    const lib = await freshLib()
    const page1 = await lib.list({})
    expect(page1).toHaveLength(20)
    const page2 = await lib.list({ page: 2 })
    expect(page2).toHaveLength(SEED_COUNT - 20)
  })

  it('search filters by name, case-insensitively', async () => {
    const lib = await freshLib()
    const all = await lib.list({ pageSize: 100 })
    const needle = (all[0]!.name ?? '').slice(0, 8)
    const hits = await lib.list({ search: needle.toUpperCase(), pageSize: 100 })
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every((m) => (m.name ?? '').toLowerCase().includes(needle.toLowerCase()))).toBe(true)
  })
})

describe('makeDemoMediaLibrary — session uploads', () => {
  it('prepends a session entry with a negative id and the injected object URL', async () => {
    const createObjectUrl = vi.fn(() => 'blob:demo/abc')
    const lib = await freshLib({ createObjectUrl })
    const file = new File(['x'], 'new-chart.png', { type: 'image/png' })
    const ref = await lib.upload(file, { alternativeText: 'A new chart' })
    expect(createObjectUrl).toHaveBeenCalledWith(file)
    expect(ref.id).toBeLessThan(0)
    expect(ref.url).toBe('blob:demo/abc')
    expect(ref.alternativeText).toBe('A new chart')
    const first = (await lib.list({}))[0]!
    expect(first.id).toBe(ref.id) // newest first
  })

  it('session ids never collide with seed ids', async () => {
    const lib = await freshLib({ createObjectUrl: () => 'blob:demo/x' })
    const ref = await lib.upload(new File(['x'], 'a.png', { type: 'image/png' }))
    const all = await lib.list({ pageSize: 200 })
    expect(new Set(all.map((m) => m.id)).size).toBe(all.length)
    expect(ref.id).toBe(-(SEED_COUNT + 1))
  })

  it('session uploads can never reach a Strapi write: mediaIdForWrite drops them', async () => {
    const lib = await freshLib({ createObjectUrl: () => 'blob:demo/y' })
    const ref = await lib.upload(new File(['x'], 'b.png', { type: 'image/png' }), { alternativeText: 'B' })
    expect(ref.url.startsWith('blob:')).toBe(true)
    expect(ref.url.startsWith('data:')).toBe(false)
    expect(mediaIdForWrite(ref)).toBeNull()
    expect(mediaIdsForWrite([ref])).toEqual([])
  })
})

describe('makeDemoMediaLibrary — updateInfo', () => {
  it('mutates alt/caption in-memory and returns the updated ref', async () => {
    const lib = await freshLib()
    const target = (await lib.list({}))[0]!
    const updated = await lib.updateInfo(target.id, { alternativeText: 'New alt', caption: 'New caption' })
    expect(updated.alternativeText).toBe('New alt')
    expect(updated.caption).toBe('New caption')
    const relisted = (await lib.list({}))[0]!
    expect(relisted.alternativeText).toBe('New alt')
  })

  it('throws for an unknown id', async () => {
    const lib = await freshLib()
    await expect(lib.updateInfo(999999, { alternativeText: 'X' })).rejects.toThrow(/not found/i)
  })

  it('list returns copies — mutating a returned ref does not corrupt the store', async () => {
    const lib = await freshLib()
    const item = (await lib.list({}))[0]!
    item.alternativeText = 'MUTATED'
    const relisted = (await lib.list({}))[0]!
    expect(relisted.alternativeText).not.toBe('MUTATED')
  })
})
