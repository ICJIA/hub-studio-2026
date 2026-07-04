// Reviewer-annotation domain model (spec §3) + the storage seam (spec §4).
// Annotations are a pure overlay on the draft PREVIEW — they never enter the
// article markdown or any publish payload.

export const ANNOTATION_COLORS = ['yellow', 'green', 'blue', 'pink'] as const
export type AnnotationColor = (typeof ANNOTATION_COLORS)[number]

export const ANNOTATION_CONTENT_TYPES = ['article', 'app', 'dataset'] as const
export type AnnotationContentType = (typeof ANNOTATION_CONTENT_TYPES)[number]

/** W3C-style text-quote anchor over the container's concatenated text-node content. */
export interface AnnotationAnchor {
  exact: string   // the highlighted text (≤ 1000 chars)
  prefix: string  // ≤ 32 chars of container text before `exact`
  suffix: string  // ≤ 32 chars after
  offset: number  // char offset of `exact` at capture time (disambiguation hint)
}

export interface AnnotationComment {
  id: string
  body: string          // plain text — rendered via Vue interpolation ONLY
  authorName: string
  authorEmail: string   // '' when unknown
  createdAt: string     // ISO 8601
}

export interface ReviewAnnotation {
  id: string
  contentType: AnnotationContentType
  documentId: string
  anchor: AnnotationAnchor
  color: AnnotationColor
  resolved: boolean
  createdAt: string
  createdBy: { name: string; email: string; roleLabel: string }
  comments: AnnotationComment[]  // comments[0] is the annotation's initial note
}

/** Storage seam (spec §4): localStorage adapter now, Strapi adapter in Phase 2. */
export interface AnnotationStore {
  list(contentType: AnnotationContentType, documentId: string): Promise<ReviewAnnotation[]>
  create(a: ReviewAnnotation): Promise<ReviewAnnotation>
  addComment(id: string, c: AnnotationComment): Promise<ReviewAnnotation>
  setResolved(id: string, resolved: boolean): Promise<ReviewAnnotation>
  remove(id: string): Promise<void>
}

/** A rail entry: an annotation plus its resolution state in the CURRENT render.
 *  (Lives here, not in the SFC — `<script setup>` cannot have named exports.) */
export interface RailThread {
  annotation: ReviewAnnotation
  orphan: boolean         // quote no longer found in the rendered text
  start: number | null    // resolved char offset (document order); null when orphaned
}
