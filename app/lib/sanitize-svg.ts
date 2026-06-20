// app/lib/sanitize-svg.ts
// SVG is the one upload format that can carry executable content (scripts, on* handlers,
// external entity refs). It is sanitized CLIENT-SIDE with DOMPurify (SVG profile) BEFORE
// upload (design spec §7; Plan 3 Global Constraints). DOMPurify needs a DOM — callers run
// in the browser; tests use the nuxt/happy-dom env.
import DOMPurify from 'dompurify'

/** True when the file is an SVG by MIME type or (for a File) a .svg name. */
export function isSvg(file: File | Blob): boolean {
  if (file.type === 'image/svg+xml') return true
  const name = (file as File).name
  return typeof name === 'string' && name.toLowerCase().endsWith('.svg')
}

/**
 * Sanitize SVG source with the SVG profile: strips <script>, on* handlers, and external
 * entity / xlink:href references. No ADD_TAGS/ADD_ATTR — we never re-admit a risky tag.
 */
export function sanitizeSvgText(svg: string): string {
  const config = {
    USE_PROFILES: { svg: true, svgFilters: true },
  }

  // DOMPurify sanitizes the SVG content but strips the <svg> root. We wrap it
  // to preserve the root element, then extract it back after sanitization.
  const wrappedSvg = `<root>${svg}</root>`
  let sanitized = DOMPurify.sanitize(wrappedSvg, config)

  // Remove xlink:href and other namespace attributes that can reference external content
  sanitized = sanitized.replace(/\s+xlink:href="[^"]*"/gi, '')
  sanitized = sanitized.replace(/\s+xmlns:xlink="[^"]*"/gi, '')

  // Extract content from <root>...</root>
  const match = sanitized.match(/<root[^>]*>([\s\S]*)<\/root>/i)
  return match ? match[1] : sanitized
}
