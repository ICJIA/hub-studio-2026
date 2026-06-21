// Shared save-time URL-scheme gate for the form validators (audit L-4: parity between
// validateApp and validateDataset). Rejects the hostile/script-bearing schemes
// (javascript:, data:, vbscript:, file:) on any user-supplied URL field, keeping bad data out
// of the store. This is belt-and-suspenders: render-time safeHref already neutralizes these,
// but the save-time check keeps the App and Dataset validators consistent.
const HOSTILE_SCHEME = /^\s*(javascript|data|vbscript|file):/i

/** True iff the URL begins with a hostile/script-bearing scheme that must never be persisted. */
export function hasHostileScheme(url: string | null | undefined): boolean {
  if (!url) return false
  return HOSTILE_SCHEME.test(url.trim())
}
