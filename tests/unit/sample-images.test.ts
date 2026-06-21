// tests/unit/sample-images.test.ts
import { describe, it, expect } from 'vitest'
import { sampleImageUrl, sampleSplashUrl } from '~/lib/sample-images'

describe('sampleImageUrl', () => {
  it('returns a /images/demo/… local URL for any seed', () => {
    for (const seed of [0, 1, 7, 15, 16, 99, 210, 1000]) {
      const url = sampleImageUrl(seed)
      expect(url).toMatch(/^\/images\/demo\//)
    }
  })

  it('never returns a picsum URL', () => {
    for (let i = 0; i < 32; i++) {
      expect(sampleImageUrl(i)).not.toContain('picsum')
    }
  })

  it('never returns a data: URI', () => {
    for (let i = 0; i < 32; i++) {
      expect(sampleImageUrl(i)).not.toMatch(/^data:/)
    }
  })

  it('is deterministic — same seed always returns the same URL', () => {
    expect(sampleImageUrl(3)).toBe(sampleImageUrl(3))
    expect(sampleImageUrl(0)).toBe(sampleImageUrl(0))
    expect(sampleImageUrl(15)).toBe(sampleImageUrl(15))
  })

  it('wraps around the pool correctly (seed 0 === seed 16 === seed 32)', () => {
    expect(sampleImageUrl(0)).toBe(sampleImageUrl(16))
    expect(sampleImageUrl(0)).toBe(sampleImageUrl(32))
  })

  it('handles negative seeds via Math.abs', () => {
    expect(sampleImageUrl(-3)).toBe(sampleImageUrl(3))
    expect(sampleImageUrl(-1)).toBe(sampleImageUrl(1))
  })

  it('returns a .jpg URL', () => {
    for (let i = 0; i < 16; i++) {
      expect(sampleImageUrl(i)).toMatch(/\.jpg$/)
    }
  })
})

describe('sampleSplashUrl', () => {
  it('returns a /images/demo/large_… local URL for any seed', () => {
    for (const seed of [0, 1, 7, 15, 16, 99, 210, -3]) {
      expect(sampleSplashUrl(seed)).toMatch(/^\/images\/demo\/large_/)
    }
  })

  it('never returns picsum or a data: URI, and is deterministic', () => {
    for (let i = 0; i < 20; i++) {
      const u = sampleSplashUrl(i)
      expect(u).not.toContain('picsum')
      expect(u).not.toMatch(/^data:/)
    }
    expect(sampleSplashUrl(3)).toBe(sampleSplashUrl(3))
    expect(sampleSplashUrl(-3)).toBe(sampleSplashUrl(3))
  })
})
