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
    mainfile: null,
    extrafile: null,
    doi: null,
    apps: [],
    datasets: [],
    updatedAt: `2026-01-${String(i + 1).padStart(2, '0')}T10:00:00.000Z`,
  }
}

// 30 items: indices 0–19 published, 20–29 draft
const seed = Array.from({ length: 30 }, (_, i) => makeItem(i, i < 20))

describe('makeDemoRepository', () => {
  it('listPage returns correct total and pageCount', async () => {
    const repo = makeDemoRepository([...seed])
    const result = await repo.listPage({ page: 1, pageSize: 10 })
    expect(result.total).toBe(30)
    expect(result.pageCount).toBe(3)
    expect(result.items.length).toBe(10)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(10)
  })

  it('listPage returns correct slice for page 2', async () => {
    const repo = makeDemoRepository([...seed])
    const p2 = await repo.listPage({ page: 2, pageSize: 10 })
    expect(p2.items.length).toBe(10)
    expect(p2.page).toBe(2)
  })

  it('listPage filters published items only', async () => {
    const repo = makeDemoRepository([...seed])
    const result = await repo.listPage({ status: 'published', page: 1, pageSize: 25 })
    expect(result.total).toBe(20)
    expect(result.items.every((i) => i.publishedAt != null)).toBe(true)
  })

  it('listPage filters draft items only', async () => {
    const repo = makeDemoRepository([...seed])
    const result = await repo.listPage({ status: 'draft', page: 1, pageSize: 25 })
    expect(result.total).toBe(10)
    expect(result.items.every((i) => i.publishedAt == null)).toBe(true)
  })

  it('list() returns the first page of items', async () => {
    const repo = makeDemoRepository([...seed])
    const items = await repo.list({ page: 1, pageSize: 10 })
    expect(items.length).toBe(10)
  })

  it('findOne returns the correct item', async () => {
    const repo = makeDemoRepository([...seed])
    const item = await repo.findOne('test-5')
    expect(item.documentId).toBe('test-5')
  })

  it('findOne throws for unknown documentId', async () => {
    const repo = makeDemoRepository([...seed])
    await expect(repo.findOne('nope')).rejects.toThrow()
  })

  it('create adds an item in-memory without touching network', async () => {
    const repo = makeDemoRepository([...seed])
    const newItem = makeItem(99, false)
    const created = await repo.create(newItem)
    expect(created.documentId).toMatch(/^demo-new-/)
    const found = await repo.findOne(created.documentId)
    expect(found.title).toBe('Article 99')
  })

  it('update replaces the item in-memory', async () => {
    const repo = makeDemoRepository([...seed])
    const item = await repo.findOne('test-3')
    const updated = await repo.update('test-3', { ...item, title: 'Updated Title' })
    expect(updated.title).toBe('Updated Title')
    const refetched = await repo.findOne('test-3')
    expect(refetched.title).toBe('Updated Title')
  })

  it('publish sets publishedAt', async () => {
    const repo = makeDemoRepository([...seed])
    const result = await repo.publish('test-22') // was draft
    expect(result.publishedAt).not.toBeNull()
  })

  it('remove deletes the item', async () => {
    const repo = makeDemoRepository([...seed])
    await repo.remove('test-0')
    await expect(repo.findOne('test-0')).rejects.toThrow()
  })

  it('sorts by updatedAt desc by default', async () => {
    const repo = makeDemoRepository([...seed])
    const result = await repo.listPage({ page: 1, pageSize: 30 })
    const dates = result.items.map((i) => (i as { updatedAt?: string }).updatedAt ?? '')
    for (let j = 0; j < dates.length - 1; j++) {
      expect(dates[j]! >= dates[j + 1]!).toBe(true)
    }
  })
})
