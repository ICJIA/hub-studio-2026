// app/lib/mappers/annotation.ts
// Strapi ⇄ domain mapping for review annotations (spec §4b). The Strapi row flattens the
// anchor (exact/prefix/suffix/offsetHint) and author (authorName/Email/Role), and stores the
// ANNOTATED entry's id as `targetDocumentId` — Strapi 5 reserves `documentId` for the row's
// own id, which becomes the domain `ReviewAnnotation.id`. The thread is a JSON column, so
// reads parse it defensively (rows can be hand-edited in the Strapi admin).
import type { AnnotationColor, AnnotationComment, AnnotationContentType, ReviewAnnotation } from '~/types/annotations'
import { ANNOTATION_COLORS, ANNOTATION_CONTENT_TYPES } from '~/types/annotations'

/** Content-Manager row: scalars + the comments JSON column. createdAt is Strapi's own stamp. */
export interface StrapiReviewAnnotation {
  documentId: string
  contentType: AnnotationContentType
  targetDocumentId: string
  exact: string
  prefix?: string | null
  suffix?: string | null
  offsetHint?: number | null
  color?: AnnotationColor | null
  resolved?: boolean | null
  authorName: string
  authorEmail?: string | null
  authorRole?: string | null
  comments?: AnnotationComment[] | null
  createdAt: string
}

/** Flat write payload (Content-Manager bodies are flat, not {data}-wrapped). Never carries
 *  id/documentId/createdAt — Strapi assigns all three. */
export interface StrapiReviewAnnotationWrite {
  contentType: AnnotationContentType
  targetDocumentId: string
  exact: string
  prefix: string
  suffix: string
  offsetHint: number
  color: AnnotationColor
  resolved: boolean
  authorName: string
  authorEmail: string
  authorRole: string
  comments: AnnotationComment[]
}

/** Defensive parse of the comments JSON column: keep only object entries with a non-blank
 *  string body; default the rest per-field (a dropped id gets a positional fallback so Vue
 *  keys stay stable within one load). */
function commentsFromJson(raw: unknown): AnnotationComment[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((c, i) => {
    if (!c || typeof c !== 'object') return []
    const o = c as Record<string, unknown>
    if (typeof o.body !== 'string' || !o.body.trim()) return []
    return [{
      id: typeof o.id === 'string' && o.id ? o.id : `comment-${i}`,
      body: o.body,
      authorName: typeof o.authorName === 'string' ? o.authorName : '',
      authorEmail: typeof o.authorEmail === 'string' ? o.authorEmail : '',
      createdAt: typeof o.createdAt === 'string' ? o.createdAt : '',
    }]
  })
}

export function annotationFromStrapi(raw: StrapiReviewAnnotation): ReviewAnnotation {
  return {
    id: raw.documentId,
    contentType: (ANNOTATION_CONTENT_TYPES as readonly string[]).includes(raw.contentType) ? raw.contentType : 'article',
    documentId: raw.targetDocumentId,
    anchor: {
      exact: raw.exact,
      prefix: raw.prefix ?? '',
      suffix: raw.suffix ?? '',
      offset: raw.offsetHint ?? 0,
    },
    color: raw.color && (ANNOTATION_COLORS as readonly string[]).includes(raw.color) ? raw.color : 'yellow',
    resolved: raw.resolved ?? false,
    createdAt: raw.createdAt,
    createdBy: {
      name: raw.authorName,
      email: raw.authorEmail ?? '',
      roleLabel: raw.authorRole ?? '',
    },
    comments: commentsFromJson(raw.comments),
  }
}

export function annotationToWrite(a: ReviewAnnotation): StrapiReviewAnnotationWrite {
  return {
    contentType: a.contentType,
    targetDocumentId: a.documentId,
    exact: a.anchor.exact,
    prefix: a.anchor.prefix,
    suffix: a.anchor.suffix,
    offsetHint: a.anchor.offset,
    color: a.color,
    resolved: a.resolved,
    authorName: a.createdBy.name,
    authorEmail: a.createdBy.email,
    authorRole: a.createdBy.roleLabel,
    comments: a.comments,
  }
}
