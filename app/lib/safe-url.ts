// Guards author-supplied URLs before they're bound to an <a href>. Only http(s) absolute,
// root-relative (/path), and #fragment links are allowed through; everything else
// (javascript:, data:, vbscript:, file:, mailto:, protocol-relative //host, …) collapses to
// '#', so a hostile scheme can never reach the DOM as a clickable, script-executing link.
export function safeHref(url?: string | null): string {
  const u = (url ?? '').trim()
  if (!u) return '#'
  if (/^https?:\/\//i.test(u)) return u   // http(s) absolute
  if (/^\/(?!\/)/.test(u)) return u        // root-relative /path (NOT //host)
  if (u.startsWith('#')) return u          // in-page anchor
  return '#'                               // reject javascript:, data:, vbscript:, etc.
}
