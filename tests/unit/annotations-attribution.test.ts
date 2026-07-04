import { describe, it, expect } from 'vitest'
import { annotationAuthor, canDeleteAnnotation } from '~/lib/annotations/attribution'
import type { ReviewAnnotation } from '~/types/annotations'

const ann = (createdByEmail: string): ReviewAnnotation => ({
  id: 'a1', contentType: 'article', documentId: 'd1',
  anchor: { exact: 'q', prefix: '', suffix: '', offset: 0 },
  color: 'yellow', resolved: false, createdAt: '2026-07-04T00:00:00.000Z',
  createdBy: { name: 'Jane', email: createdByEmail, roleLabel: 'Author' },
  comments: [],
})

describe('annotationAuthor', () => {
  it('uses displayName + email for a real session', () => {
    expect(annotationAuthor({ displayName: 'Jane Smith', email: 'jane@icjia.gov', canPublish: false, demo: false }))
      .toEqual({ name: 'Jane Smith', email: 'jane@icjia.gov', roleLabel: 'Author' })
  })
  it('appends the demo marker to the role label in demo sessions', () => {
    expect(annotationAuthor({ displayName: 'Dev Editor', email: 'dev-editor@localhost', canPublish: true, demo: true }))
      .toEqual({ name: 'Dev Editor', email: 'dev-editor@localhost', roleLabel: 'Editor · demo' })
  })
  it('falls back to the role label when displayName is empty, and to empty email', () => {
    expect(annotationAuthor({ displayName: null, email: null, canPublish: true, demo: false }))
      .toEqual({ name: 'Editor', email: '', roleLabel: 'Editor' })
  })
})

describe('canDeleteAnnotation', () => {
  it('lets an Editor delete any thread', () => {
    expect(canDeleteAnnotation(ann('someone@else.gov'), { email: 'ed@icjia.gov', canPublish: true })).toBe(true)
  })
  it('lets the creator delete their own thread', () => {
    expect(canDeleteAnnotation(ann('jane@icjia.gov'), { email: 'jane@icjia.gov', canPublish: false })).toBe(true)
  })
  it('blocks a non-editor non-creator', () => {
    expect(canDeleteAnnotation(ann('jane@icjia.gov'), { email: 'other@icjia.gov', canPublish: false })).toBe(false)
  })
  it('never matches on empty emails', () => {
    expect(canDeleteAnnotation(ann(''), { email: '', canPublish: false })).toBe(false)
  })
})
