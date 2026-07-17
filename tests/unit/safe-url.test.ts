import { describe, it, expect } from 'vitest'
import { safeHref, safeMediaUrl } from '~/lib/safe-url'

describe('safeHref', () => {
  it('passes https:// absolute URLs through', () => {
    expect(safeHref('https://x.org')).toBe('https://x.org')
  })
  it('passes http:// absolute URLs through', () => {
    expect(safeHref('http://x.org')).toBe('http://x.org')
  })
  it('passes root-relative /path through', () => {
    expect(safeHref('/path/to/page')).toBe('/path/to/page')
  })
  it('passes in-page #anchor through', () => {
    expect(safeHref('#section')).toBe('#section')
  })
  it('rejects javascript: scheme (lowercase)', () => {
    expect(safeHref('javascript:alert(1)')).toBe('#')
  })
  it('rejects JavaScript: scheme (mixed case)', () => {
    expect(safeHref('JavaScript:alert(1)')).toBe('#')
  })
  it('rejects data: scheme', () => {
    expect(safeHref('data:text/html,<script>alert(1)</script>')).toBe('#')
  })
  it('rejects vbscript: scheme', () => {
    expect(safeHref('vbscript:msgbox(1)')).toBe('#')
  })
  it('rejects protocol-relative //evil.com', () => {
    expect(safeHref('//evil.com')).toBe('#')
  })
  it('returns # for empty string', () => {
    expect(safeHref('')).toBe('#')
  })
  it('returns # for null', () => {
    expect(safeHref(null)).toBe('#')
  })
  it('returns # for undefined', () => {
    expect(safeHref(undefined)).toBe('#')
  })
})

// safeMediaUrl guards MediaRef-derived urls (media pipeline: Strapi uploads or this session's
// own blob: object URLs) bound to <img src> / download hrefs — NOT author-typed text. It must
// pass blob: (demo/session uploads render in previews) and return '' (falsy → v-if hides the
// element) on rejection — safeHref's '#' is truthy and renders a BROKEN img.
describe('safeMediaUrl', () => {
  it('passes https:// absolute URLs through', () => {
    expect(safeMediaUrl('https://cdn.example.org/uploads/a.jpg')).toBe('https://cdn.example.org/uploads/a.jpg')
  })
  it('passes http:// absolute URLs through', () => {
    expect(safeMediaUrl('http://localhost:1337/uploads/a.jpg')).toBe('http://localhost:1337/uploads/a.jpg')
  })
  it('passes root-relative /path through', () => {
    expect(safeMediaUrl('/images/demo/medium_splash.jpg')).toBe('/images/demo/medium_splash.jpg')
  })
  it('passes blob: object URLs through (demo session uploads)', () => {
    const u = 'blob:http://localhost:3000/0aa2b6c3-4d5e-6f70-8192-a3b4c5d6e7f8'
    expect(safeMediaUrl(u)).toBe(u)
  })
  it('rejects data: URIs to empty string (zero-base64 posture)', () => {
    expect(safeMediaUrl('data:image/png;base64,AAAA')).toBe('')
  })
  it('rejects javascript: to empty string', () => {
    expect(safeMediaUrl('javascript:alert(1)')).toBe('')
  })
  it('rejects protocol-relative //host to empty string', () => {
    expect(safeMediaUrl('//evil.example/x.jpg')).toBe('')
  })
  it('rejects mixed-case Blob-lookalike schemes that are not blob: at all', () => {
    expect(safeMediaUrl('bloby:whatever')).toBe('')
  })
  it('accepts mixed-case BLOB: (schemes are case-insensitive)', () => {
    expect(safeMediaUrl('BLOB:http://localhost:3000/uuid')).toBe('BLOB:http://localhost:3000/uuid')
  })
  it('returns empty string for empty/null/undefined', () => {
    expect(safeMediaUrl('')).toBe('')
    expect(safeMediaUrl(null)).toBe('')
    expect(safeMediaUrl(undefined)).toBe('')
  })
})
