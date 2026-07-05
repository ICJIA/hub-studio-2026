// tests/unit/annotations-rail-layout.test.ts
// Word-style comment alignment: each card wants to sit level with its highlight
// (desiredTop); overlapping cards get pushed DOWN in document order, never up.
import { describe, it, expect } from 'vitest'
import { layoutRailCards } from '~/lib/annotations/rail-layout'

describe('layoutRailCards', () => {
  it('places non-overlapping cards exactly at their desired tops', () => {
    const { positions, totalHeight } = layoutRailCards([
      { id: 'a', desiredTop: 0, height: 100 },
      { id: 'b', desiredTop: 300, height: 80 },
    ], 12)
    expect(positions).toEqual({ a: 0, b: 300 })
    expect(totalHeight).toBe(380)
  })

  it('pushes an overlapping card down below its predecessor plus the gap', () => {
    const { positions } = layoutRailCards([
      { id: 'a', desiredTop: 100, height: 200 },
      { id: 'b', desiredTop: 150, height: 80 }, // wants 150, but a occupies 100–300
    ], 12)
    expect(positions.a).toBe(100)
    expect(positions.b).toBe(312) // 100 + 200 + 12
  })

  it('cascades pushes through a cluster of anchors on the same line', () => {
    const { positions } = layoutRailCards([
      { id: 'a', desiredTop: 50, height: 60 },
      { id: 'b', desiredTop: 50, height: 60 },
      { id: 'c', desiredTop: 50, height: 60 },
    ], 10)
    expect(positions).toEqual({ a: 50, b: 120, c: 190 })
  })

  it('sorts by desiredTop regardless of input order (orphans at 0 lead)', () => {
    const { positions } = layoutRailCards([
      { id: 'late', desiredTop: 400, height: 50 },
      { id: 'orphan', desiredTop: 0, height: 50 },
      { id: 'early', desiredTop: 90, height: 50 },
    ], 12)
    expect(positions.orphan).toBe(0)
    expect(positions.early).toBe(90)
    expect(positions.late).toBe(400)
  })

  it('handles the empty list', () => {
    expect(layoutRailCards([], 12)).toEqual({ positions: {}, totalHeight: 0 })
  })
})
