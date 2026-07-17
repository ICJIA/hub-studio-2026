// tests/unit/studio-profile-repo.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createStudioProfileRepository, findByAuthorEmail } from '~/repositories/studio-profile'
import type { $Fetch } from 'ofetch'

const UID = 'api::studio-profile.studio-profile'
const BASE = `/content-manager/collection-types/${UID}`

describe('studio-profile repository', () => {
  it('findByAuthorEmail filters the list by authorEmail and returns the FIRST result', async () => {
    const api = vi.fn().mockResolvedValue({
      results: [{ documentId: 'p1', authorEmail: 'author@icjia.illinois.gov', reviewers: ['mgr@icjia.illinois.gov'], center: 'Research & Analysis' }],
      pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 },
    }) as unknown as $Fetch

    const repo = createStudioProfileRepository(api)
    const out = await findByAuthorEmail(repo, 'author@icjia.illinois.gov')

    // The list GET carries the authorEmail filter as a flat bracket-key param (CRITICAL fix,
    // whole-branch review: a nested `filters: {...}` object gets JSON-stringified onto the wire
    // by ofetch/ufo and rejected by Strapi 5's qs-based parser — findByAuthorEmail flows through
    // repo.list() → the SAME createRepository()/flattenFilters() path as the title search fix,
    // so it is fixed automatically; this assertion locks in the wire shape here too).
    expect(api).toHaveBeenCalledWith(
      BASE,
      expect.objectContaining({
        query: expect.objectContaining({ 'filters[authorEmail][$eq]': 'author@icjia.illinois.gov' }),
      }),
    )
    expect(out).not.toBeNull()
    expect(out!.documentId).toBe('p1')
    expect(out!.reviewers).toEqual(['mgr@icjia.illinois.gov'])
    expect(out!.center).toBe('Research & Analysis')
  })

  it('findByAuthorEmail returns null when no row matches', async () => {
    const api = vi.fn().mockResolvedValue({ results: [], pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } }) as unknown as $Fetch
    const repo = createStudioProfileRepository(api)
    expect(await findByAuthorEmail(repo, 'nobody@icjia.illinois.gov')).toBeNull()
  })

  it('create POSTs a FLAT body of { authorEmail, reviewers, center }', async () => {
    const api = vi.fn().mockResolvedValue({
      data: { documentId: 'p2', authorEmail: 'new@icjia.illinois.gov', reviewers: ['m@icjia.illinois.gov'], center: 'Federal & State Grants' },
    }) as unknown as $Fetch
    const repo = createStudioProfileRepository(api)

    await repo.create({ documentId: '', authorEmail: 'new@icjia.illinois.gov', reviewers: ['m@icjia.illinois.gov'], center: 'Federal & State Grants', publishedAt: null })

    expect(api).toHaveBeenCalledWith(
      BASE,
      expect.objectContaining({
        method: 'POST',
        body: { authorEmail: 'new@icjia.illinois.gov', reviewers: ['m@icjia.illinois.gov'], center: 'Federal & State Grants' },
      }),
    )
  })
})
