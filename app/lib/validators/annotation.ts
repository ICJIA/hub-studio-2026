// app/lib/validators/annotation.ts
// Write-boundary validator for review annotations (spec §4b). The anchor capture and the
// composer UI already enforce all of this — the validator is defense in depth at the Strapi
// write seam (same posture as the base64 guard on articles), so a direct store caller can
// never persist an out-of-contract row.
import type { ReviewAnnotation } from '~/types/annotations'
import { ANNOTATION_COLORS, ANNOTATION_CONTENT_TYPES } from '~/types/annotations'
import type { FieldError } from '~/lib/validators/article'

/** Capture limits — mirror app/lib/annotations/anchor.ts (spec §5). */
const EXACT_MAX = 1000
const CONTEXT_MAX = 32

export function validateAnnotation(a: ReviewAnnotation): FieldError[] {
  const errors: FieldError[] = []
  if (!a.documentId?.trim()) {
    errors.push({ field: 'documentId', message: 'Target documentId is required.' })
  }
  if (!(ANNOTATION_CONTENT_TYPES as readonly string[]).includes(a.contentType)) {
    errors.push({ field: 'contentType', message: `Content type must be one of: ${ANNOTATION_CONTENT_TYPES.join(', ')}.` })
  }
  if (!(ANNOTATION_COLORS as readonly string[]).includes(a.color)) {
    errors.push({ field: 'color', message: `Color must be one of: ${ANNOTATION_COLORS.join(', ')}.` })
  }
  if (!a.anchor.exact.trim() || a.anchor.exact.length > EXACT_MAX) {
    errors.push({ field: 'anchor', message: `Quote must be non-empty and at most ${EXACT_MAX} characters.` })
  }
  if (a.anchor.prefix.length > CONTEXT_MAX || a.anchor.suffix.length > CONTEXT_MAX) {
    errors.push({ field: 'anchor', message: `Anchor context must be at most ${CONTEXT_MAX} characters.` })
  }
  if (a.comments.length === 0 || !a.comments[0]!.body.trim()) {
    errors.push({ field: 'comments', message: 'An annotation needs an initial comment with a non-empty body.' })
  }
  return errors
}
