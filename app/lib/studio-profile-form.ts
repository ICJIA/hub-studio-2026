// Pure form helpers for first-login onboarding (Plan 7). blankStudioProfile seeds the form
// (prefilling the author's email); validateStudioProfile enforces the required fields BEFORE any
// write — reviewers (≥1, each a valid email via the shared isValidEmail) and center are required;
// authorEmail is prefilled+read-only but also guarded here for safety. Returns the same FieldError[]
// the forms layer surfaces per-field.
import { isValidEmail } from '~/lib/review-email'
import type { FieldError } from '~/lib/validators/article'
import type { StudioProfile } from '~/types/studio-profile'

export function blankStudioProfile(authorEmail = ''): StudioProfile {
  return { documentId: '', authorEmail, reviewers: [], center: '', publishedAt: null }
}

export function validateStudioProfile(p: StudioProfile): FieldError[] {
  const errors: FieldError[] = []

  if (!p.authorEmail || !p.authorEmail.trim()) {
    errors.push({ field: 'authorEmail', message: 'Your email is required.' })
  }

  const reviewers = (p.reviewers ?? []).map((r) => r.trim()).filter(Boolean)
  if (reviewers.length === 0) {
    errors.push({ field: 'reviewers', message: 'Enter at least one reviewer/manager email.' })
  } else {
    const bad = reviewers.find((r) => !isValidEmail(r))
    if (bad) errors.push({ field: 'reviewers', message: `Invalid reviewer email: ${bad}` })
  }

  if (!p.center || !p.center.trim()) {
    errors.push({ field: 'center', message: 'Select your center.' })
  }

  return errors
}
