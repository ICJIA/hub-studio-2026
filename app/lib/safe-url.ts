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

/** Guards MEDIA-PIPELINE urls (MediaRef.url: Strapi uploads, bundled demo assets, or this
 *  session's own blob: object URLs) bound to <img src> or download hrefs. NOT for author-typed
 *  text — that stays on safeHref/markdown-it. Two deliberate differences from safeHref:
 *  `blob:` is allowed (demo/session uploads must render in previews; the zero-base64 posture is
 *  "blob:, never data:" — data: stays rejected), and rejection returns '' (falsy, so a v-if
 *  hides the element) instead of '#' — a truthy '#' src renders a BROKEN image. */
export function safeMediaUrl(url?: string | null): string {
  const u = (url ?? '').trim()
  if (!u) return ''
  if (/^https?:\/\//i.test(u)) return u   // http(s) absolute
  if (/^\/(?!\/)/.test(u)) return u        // root-relative /path (NOT //host)
  if (/^blob:/i.test(u)) return u          // session object URL (same-origin by construction)
  return ''                                // reject data:, javascript:, //host, etc.
}
