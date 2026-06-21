// tests/unit/toc-scrollspy.test.ts
import { describe, it, expect } from 'vitest'
import { pickActiveHeadingId } from '~/lib/toc-scrollspy'

const h = (id: string, top: number) => ({ id, top })

describe('pickActiveHeadingId', () => {
  it('returns null for an empty list', () => {
    expect(pickActiveHeadingId([], 80)).toBeNull()
  })

  it('returns the first heading id when no heading has reached the active line (top of page)', () => {
    // All headings are below the fold (positive top values far down)
    const headings = [h('intro', 300), h('methods', 900), h('results', 1500)]
    expect(pickActiveHeadingId(headings, 80)).toBe('intro')
  })

  it('returns first heading when at the very top (all headings still below offset)', () => {
    const headings = [h('intro', 100), h('methods', 600)]
    // offset=80, threshold=84 — intro top is 100, not yet crossed
    expect(pickActiveHeadingId(headings, 80)).toBe('intro')
  })

  it('activates the first heading once it crosses the threshold', () => {
    const headings = [h('intro', 80), h('methods', 600)]
    // offset=80, threshold=84 — intro top is 80, exactly at threshold
    expect(pickActiveHeadingId(headings, 80)).toBe('intro')
  })

  it('returns the middle heading when scrolled past intro but not yet to results', () => {
    // headings relative to container viewport top after scrolling
    const headings = [h('intro', -200), h('methods', 50), h('results', 500)]
    // offset=80, threshold=84 — methods top=50 <= 84, results top=500 > 84
    expect(pickActiveHeadingId(headings, 80)).toBe('methods')
  })

  it('returns the last heading when scrolled to the bottom (all headings above line)', () => {
    const headings = [h('intro', -800), h('methods', -400), h('results', -100)]
    // All tops <= threshold, so last wins
    expect(pickActiveHeadingId(headings, 80)).toBe('results')
  })

  it('works with a single heading — always active', () => {
    expect(pickActiveHeadingId([h('only', 200)], 80)).toBe('only')
    expect(pickActiveHeadingId([h('only', -100)], 80)).toBe('only')
  })

  it('uses offset + 4 as the threshold (not just offset)', () => {
    // top == offset + 4 should be included
    const headings = [h('a', 84), h('b', 200)]
    expect(pickActiveHeadingId(headings, 80)).toBe('a') // 84 <= 84
  })

  it('top == offset + 5 is NOT yet active (falls through to first)', () => {
    const headings = [h('a', 85), h('b', 200)]
    // 85 > 84, no heading crosses, first heading wins
    expect(pickActiveHeadingId(headings, 80)).toBe('a') // first heading fallback
  })

  it('prefers the last heading that crossed the line when multiple are above', () => {
    const headings = [h('intro', -300), h('methods', -100), h('results', 20)]
    // offset=80, threshold=84 — all three: -300, -100, 20 are <= 84 → last = results
    expect(pickActiveHeadingId(headings, 80)).toBe('results')
  })
})
