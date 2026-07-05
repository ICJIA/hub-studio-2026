// tests/unit/annotations-validator.test.ts
// Write-boundary validator for review annotations (spec §4b): quote present and within the
// capture limits, color/contentType in enum, initial comment non-empty, target id present.
// The anchor capture + composer UI already enforce these — the validator is defense in depth
// at the Strapi write seam (same posture as the base64 guard on articles).
import { describe, it, expect } from 'vitest'
import { validateAnnotation } from '~/lib/validators/annotation'
import type { ReviewAnnotation } from '~/types/annotations'

function valid(): ReviewAnnotation {
  return {
    id: 'a1', contentType: 'article', documentId: 'art-42',
    anchor: { exact: 'brown fox', prefix: 'The quick ', suffix: ' jumps', offset: 10 },
    color: 'yellow', resolved: false, createdAt: '2026-07-05T09:00:00.000Z',
    createdBy: { name: 'Jo', email: 'jo@icjia.gov', roleLabel: 'Editor' },
    comments: [{ id: 'c1', body: 'Note', authorName: 'Jo', authorEmail: 'jo@icjia.gov', createdAt: '2026-07-05T09:00:00.000Z' }],
  }
}

describe('validateAnnotation', () => {
  it('accepts a well-formed annotation', () => {
    expect(validateAnnotation(valid())).toEqual([])
  })
  it('requires the target documentId', () => {
    expect(validateAnnotation({ ...valid(), documentId: ' ' }).map((e) => e.field)).toContain('documentId')
  })
  it('rejects an unknown contentType and an unknown color', () => {
    const fields = validateAnnotation({
      ...valid(),
      contentType: 'page' as ReviewAnnotation['contentType'],
      color: 'mauve' as ReviewAnnotation['color'],
    }).map((e) => e.field)
    expect(fields).toContain('contentType')
    expect(fields).toContain('color')
  })
  it('requires a non-empty quote within the 1000-char capture limit', () => {
    expect(validateAnnotation({ ...valid(), anchor: { ...valid().anchor, exact: '  ' } }).map((e) => e.field)).toContain('anchor')
    expect(validateAnnotation({ ...valid(), anchor: { ...valid().anchor, exact: 'x'.repeat(1001) } }).map((e) => e.field)).toContain('anchor')
  })
  it('caps prefix/suffix at the 32-char capture limit', () => {
    expect(validateAnnotation({ ...valid(), anchor: { ...valid().anchor, prefix: 'p'.repeat(33) } }).map((e) => e.field)).toContain('anchor')
    expect(validateAnnotation({ ...valid(), anchor: { ...valid().anchor, suffix: 's'.repeat(33) } }).map((e) => e.field)).toContain('anchor')
  })
  it('requires an initial comment with a non-empty body', () => {
    expect(validateAnnotation({ ...valid(), comments: [] }).map((e) => e.field)).toContain('comments')
    const blankBody = { ...valid(), comments: [{ ...valid().comments[0]!, body: '   ' }] }
    expect(validateAnnotation(blankBody).map((e) => e.field)).toContain('comments')
  })
})
