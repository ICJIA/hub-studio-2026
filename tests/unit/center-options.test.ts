import { describe, it, expect } from 'vitest'
import { CENTER_OPTIONS } from '~/lib/center-options'

describe('CENTER_OPTIONS (placeholder)', () => {
  it('is a non-empty list of unique non-blank strings', () => {
    expect(CENTER_OPTIONS.length).toBeGreaterThan(0)
    expect(CENTER_OPTIONS.every((c) => typeof c === 'string' && c.trim().length > 0)).toBe(true)
    expect(new Set(CENTER_OPTIONS).size).toBe(CENTER_OPTIONS.length)
  })
})
