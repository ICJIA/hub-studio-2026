// tests/unit/repository-publish.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createRepository, type Relations } from '~/lib/repository'
import type { $Fetch } from 'ofetch'

interface Raw { documentId: string; title: string; publishedAt: string | null }
interface Dom { documentId: string; title: string; publishedAt: string | null; rels: Relations }
const fromStrapi = (r: Raw, relations: Relations = {}): Dom => ({ ...r, rels: relations })
const toWrite = (d: Dom) => ({ title: d.title })

const UID = 'api::article.article'
const BASE = `/content-manager/collection-types/${UID}`
const makeRepo = (api: $Fetch) =>
  createRepository<Raw, Dom, { title: string }>({ api, uid: UID, relationFields: [], fromStrapi, toWrite })

describe('createRepository.publish (Content-Manager publish action)', () => {
  it('POSTs the publish action for the documentId and returns the published entity', async () => {
    // The publish action returns the entry in a {data} envelope (like create/update), now with publishedAt set.
    const api = vi.fn().mockResolvedValue({
      data: { documentId: 'a1', title: 'Crime In Illinois', publishedAt: '2026-06-20T12:00:00.000Z' },
    }) as unknown as $Fetch

    const out = await makeRepo(api).publish('a1')

    // Endpoint + method: POST /content-manager/collection-types/{uid}/{documentId}/actions/publish
    expect(api).toHaveBeenCalledWith(
      `${BASE}/a1/actions/publish`,
      expect.objectContaining({ method: 'POST' }),
    )
    // Returns the mapped, now-published domain entity.
    expect(out.documentId).toBe('a1')
    expect(out.publishedAt).toBe('2026-06-20T12:00:00.000Z')
  })
})
