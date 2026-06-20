// tests/unit/sanitize-svg.test.ts
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { isSvg, sanitizeSvgText } from '~/lib/sanitize-svg'

describe('isSvg', () => {
  it('detects an SVG by MIME type', () => {
    expect(isSvg(new Blob(['<svg/>'], { type: 'image/svg+xml' }))).toBe(true)
  })
  it('detects an SVG by .svg filename (case-insensitive), and rejects raster types', () => {
    expect(isSvg(new File(['<svg/>'], 'drawing.SVG', { type: '' }))).toBe(true)
    expect(isSvg(new File(['x'], 'photo.png', { type: 'image/png' }))).toBe(false)
  })
})

describe('sanitizeSvgText', () => {
  it('strips <script> and on* handlers from an SVG', () => {
    const dirty = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10" onload="evil()"/></svg>'
    const clean = sanitizeSvgText(dirty)
    expect(clean).not.toMatch(/<script/i)
    expect(clean).not.toMatch(/onload/i)
    expect(clean).not.toMatch(/alert\(1\)/)
  })
  it('drops external xlink:href references', () => {
    const dirty = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><image xlink:href="http://evil.example/x.svg"/></svg>'
    const r = sanitizeSvgText(dirty)
    expect(r).not.toMatch(/xlink:href/i)
    expect(r).not.toMatch(/evil\.example/i)
  })
  it('keeps a clean <svg><rect/></svg> intact', () => {
    const clean = sanitizeSvgText('<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>')
    expect(clean).toMatch(/<svg/i)
    expect(clean).toMatch(/<rect/i)
  })
})
