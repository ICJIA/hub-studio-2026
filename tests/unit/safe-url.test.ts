import { describe, it, expect } from 'vitest'
import { safeHref } from '~/lib/safe-url'

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
