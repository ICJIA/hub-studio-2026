// Allowed image upload extensions (user 2026-06-20): v1 over-rejected valid types.
// Accepted set is jpg/jpeg/png/svg (case-insensitive). The Plan 3 upload dropzone uses
// this as its accept-filter (shared source of truth). SVG must be DOMPurify-sanitized
// before upload (Plan 3) — not handled here.
export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'svg'] as const

// Allowed document extensions for the 'file' kind (PDF + common office formats).
// Strapi's Media Library accepts these natively; no image processing is applied.
export const ALLOWED_DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'xlsx', 'csv'] as const

/** True if the URL or filename ends in an allowed image extension (query/hash ignored). */
export function hasAllowedImageExtension(urlOrName: string): boolean {
  const path = urlOrName.split(/[?#]/)[0] ?? ''
  const dot = path.lastIndexOf('.')
  if (dot < 0 || dot === path.length - 1) return false
  const ext = path.slice(dot + 1).toLowerCase()
  return (ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(ext)
}

/** True if the URL or filename ends in an allowed document extension (query/hash ignored). */
export function hasAllowedDocumentExtension(urlOrName: string): boolean {
  const path = urlOrName.split(/[?#]/)[0] ?? ''
  const dot = path.lastIndexOf('.')
  if (dot < 0 || dot === path.length - 1) return false
  const ext = path.slice(dot + 1).toLowerCase()
  return (ALLOWED_DOCUMENT_EXTENSIONS as readonly string[]).includes(ext)
}
