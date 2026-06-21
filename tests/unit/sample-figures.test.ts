// tests/unit/sample-figures.test.ts
import { describe, it, expect } from 'vitest'
import { sampleFigureUrl, sampleFigureRef } from '~/lib/sample-figures'

describe('sampleFigureUrl', () => {
  it('returns a /images/demo/figures/…svg local URL for any seed', () => {
    for (const seed of [0, 1, 7, 10, 11, 99, 210, 1000]) {
      expect(sampleFigureUrl(seed)).toMatch(/^\/images\/demo\/figures\/figure-[\w-]+\.svg$/)
    }
  })

  it('never returns a picsum URL', () => {
    for (let i = 0; i < 32; i++) {
      expect(sampleFigureUrl(i)).not.toContain('picsum')
    }
  })

  it('never returns a data: URI', () => {
    for (let i = 0; i < 32; i++) {
      expect(sampleFigureUrl(i)).not.toMatch(/^data:/)
    }
  })

  it('is deterministic — same seed always returns the same URL', () => {
    expect(sampleFigureUrl(3)).toBe(sampleFigureUrl(3))
    expect(sampleFigureUrl(0)).toBe(sampleFigureUrl(0))
    expect(sampleFigureUrl(7)).toBe(sampleFigureUrl(7))
  })

  it('handles negative seeds via Math.abs', () => {
    expect(sampleFigureUrl(-3)).toBe(sampleFigureUrl(3))
    expect(sampleFigureUrl(-1)).toBe(sampleFigureUrl(1))
  })
})

describe('sampleFigureRef', () => {
  it('returns a display-only ref (id 0) with an SVG figure URL and no data: URI', () => {
    for (const seed of [0, 1, 5, 10, 17]) {
      const ref = sampleFigureRef(seed)
      expect(ref.id).toBe(0)
      expect(ref.url).toMatch(/^\/images\/demo\/figures\/figure-[\w-]+\.svg$/)
      expect(ref.url).not.toContain('picsum')
      expect(ref.url).not.toMatch(/^data:/)
    }
  })

  it('name is the bare figure filename (e.g. figure-bar-01.svg)', () => {
    for (const seed of [0, 1, 5, 10, 17]) {
      const ref = sampleFigureRef(seed)
      expect(ref.name).toMatch(/^figure-[\w-]+\.svg$/)
      expect(ref.url.endsWith(`/${ref.name}`)).toBe(true)
    }
  })

  it('carries svg mime, alt text, and 640x384 dimensions', () => {
    const ref = sampleFigureRef(2)
    expect(ref.mime).toBe('image/svg+xml')
    expect(ref.width).toBe(640)
    expect(ref.height).toBe(384)
    expect((ref.alternativeText ?? '').trim().length).toBeGreaterThan(0)
  })

  it('is deterministic for the same seed', () => {
    expect(sampleFigureRef(4).url).toBe(sampleFigureRef(4).url)
  })
})
