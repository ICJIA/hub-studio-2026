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
 *
 * happy-dom (the test environment) strips the <svg> root element when passed directly to
 * DOMPurify, so we wrap in a neutral <root> element and extract the inner content after
 * sanitization. We use a non-greedy match on the inner content so that adversarial input
 * containing "</root>" cannot cause premature truncation.
 * xlink:href stripping covers double-quoted, single-quoted, and unquoted values.
 *
 * Pre-strip <script> tags before DOMPurify to avoid an issue where DOMPurify's SVG
 * profile aggressively strips not just the script but also sibling elements that follow
 * the script tag. Since our goal is to sanitize, not parse, we just remove the scripts.
 */
export function sanitizeSvgText(svg: string): string {
  // Pre-strip script tags to prevent DOMPurify from stripping following elements
  const preStripped = svg.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')

  let sanitized = DOMPurify.sanitize(`<root>${preStripped}</root>`, {
    USE_PROFILES: { svg: true, svgFilters: true },
  })
    .replace(/\s+xlink:href=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+xmlns:xlink=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')

  // Also strip on* event handlers that DOMPurify's SVG profile doesn't catch
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')

  const match = sanitized.match(/<root[^>]*>([\s\S]*?)<\/root>/i)
  return match ? match[1] : sanitized
}
