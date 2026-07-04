// Attribution + permission rules for review annotations (spec §1, §3). Pure and
// unit-testable; the composable feeds these from the auth store + isDemoSession().
import { roleLabel } from '~/lib/admin-roles'
import type { ReviewAnnotation } from '~/types/annotations'

export interface AnnotationAuthor { name: string; email: string; roleLabel: string }

export function annotationAuthor(opts: {
  displayName: string | null
  email: string | null | undefined
  canPublish: boolean
  demo: boolean
}): AnnotationAuthor {
  const base = roleLabel(opts.canPublish)
  return {
    name: opts.displayName || base,
    email: opts.email ?? '',
    roleLabel: opts.demo ? `${base} · demo` : base,
  }
}

/** Delete rule (spec §1): the thread's creator or any Editor. Empty emails never match. */
export function canDeleteAnnotation(
  a: ReviewAnnotation,
  user: { email: string; canPublish: boolean },
): boolean {
  if (user.canPublish) return true
  return Boolean(a.createdBy.email) && a.createdBy.email === user.email
}
