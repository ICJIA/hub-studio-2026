// tests/unit/annotations-mapper.test.ts
// Strapi ⇄ domain mapping for review annotations (spec §4b). The Strapi side flattens the
// anchor (exact/prefix/suffix/offsetHint) and the author (authorName/Email/Role), stores the
// TARGET entry id as targetDocumentId (Strapi 5 reserves documentId for the row's own id),
// and keeps the thread as a JSON array — the mapper translates both directions and treats
// server JSON defensively (comments could be hand-edited in the Strapi admin).
import { describe, it, expect } from 'vitest'
import { annotationFromStrapi, annotationToWrite, type StrapiReviewAnnotation } from '~/lib/mappers/annotation'
import type { ReviewAnnotation } from '~/types/annotations'

const raw: StrapiReviewAnnotation = {
  documentId: 'ra-server-1',
  contentType: 'article',
  targetDocumentId: 'art-42',
  exact: 'brown fox', prefix: 'The quick ', suffix: ' jumps', offsetHint: 10,
  color: 'green', resolved: false,
  authorName: 'Jo Editor', authorEmail: 'jo@icjia.gov', authorRole: 'Editor',
  comments: [{ id: 'c1', body: 'Cite this.', authorName: 'Jo Editor', authorEmail: 'jo@icjia.gov', createdAt: '2026-07-05T10:00:00.000Z' }],
  createdAt: '2026-07-05T09:00:00.000Z',
}

const domain: ReviewAnnotation = {
  id: 'local-uuid', contentType: 'article', documentId: 'art-42',
  anchor: { exact: 'brown fox', prefix: 'The quick ', suffix: ' jumps', offset: 10 },
  color: 'green', resolved: false, createdAt: '2026-07-05T09:00:00.000Z',
  createdBy: { name: 'Jo Editor', email: 'jo@icjia.gov', roleLabel: 'Editor' },
  comments: [{ id: 'c1', body: 'Cite this.', authorName: 'Jo Editor', authorEmail: 'jo@icjia.gov', createdAt: '2026-07-05T10:00:00.000Z' }],
}

describe('annotationFromStrapi', () => {
  it('maps the row: its OWN documentId becomes the annotation id; targetDocumentId the entry id', () => {
    const a = annotationFromStrapi(raw)
    expect(a.id).toBe('ra-server-1')
    expect(a.documentId).toBe('art-42')
    expect(a.anchor).toEqual({ exact: 'brown fox', prefix: 'The quick ', suffix: ' jumps', offset: 10 })
    expect(a.createdBy).toEqual({ name: 'Jo Editor', email: 'jo@icjia.gov', roleLabel: 'Editor' })
    expect(a.comments).toHaveLength(1)
    expect(a.createdAt).toBe('2026-07-05T09:00:00.000Z')
  })

  it('defaults optional scalars (prefix/suffix/offsetHint/color/resolved/author fields)', () => {
    const a = annotationFromStrapi({
      documentId: 'ra-2', contentType: 'dataset', targetDocumentId: 'ds-1',
      exact: 'q', authorName: 'A', createdAt: '2026-07-05T09:00:00.000Z',
    })
    expect(a.anchor).toEqual({ exact: 'q', prefix: '', suffix: '', offset: 0 })
    expect(a.color).toBe('yellow')
    expect(a.resolved).toBe(false)
    expect(a.createdBy).toEqual({ name: 'A', email: '', roleLabel: '' })
    expect(a.comments).toEqual([])
  })

  it('parses comments JSON defensively: drops non-objects and bodyless entries, defaults missing fields', () => {
    const a = annotationFromStrapi({
      ...raw,
      comments: [
        'garbage', 42, null,
        { body: '   ' },                                  // whitespace-only → dropped
        { body: 'Kept.', createdAt: '2026-07-05T11:00:00.000Z' }, // no id/author → defaulted
      ] as unknown as StrapiReviewAnnotation['comments'],
    })
    expect(a.comments).toHaveLength(1)
    expect(a.comments[0]!.body).toBe('Kept.')
    expect(a.comments[0]!.id).not.toBe('')
    expect(a.comments[0]!.authorName).toBe('')
    expect(a.comments[0]!.authorEmail).toBe('')
  })
})

describe('annotationToWrite', () => {
  it('flattens the domain shape and NEVER sends id/createdAt (Strapi owns both)', () => {
    const w = annotationToWrite(domain) as Record<string, unknown>
    expect(w).toEqual({
      contentType: 'article', targetDocumentId: 'art-42',
      exact: 'brown fox', prefix: 'The quick ', suffix: ' jumps', offsetHint: 10,
      color: 'green', resolved: false,
      authorName: 'Jo Editor', authorEmail: 'jo@icjia.gov', authorRole: 'Editor',
      comments: domain.comments,
    })
    expect('id' in w).toBe(false)
    expect('documentId' in w).toBe(false)
    expect('createdAt' in w).toBe(false)
  })

  it('round-trips: fromStrapi(server row built from toWrite) preserves the domain fields', () => {
    const w = annotationToWrite(domain)
    const back = annotationFromStrapi({ ...w, documentId: 'ra-new', createdAt: '2026-07-05T12:00:00.000Z' })
    expect(back.documentId).toBe(domain.documentId)
    expect(back.anchor).toEqual(domain.anchor)
    expect(back.color).toBe(domain.color)
    expect(back.createdBy).toEqual(domain.createdBy)
    expect(back.comments).toEqual(domain.comments)
  })
})
