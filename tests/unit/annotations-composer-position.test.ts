// tests/unit/annotations-composer-position.test.ts
// The composer styles position:fixed left/top — viewport coordinates on the /preview page,
// but CONTAINER coordinates inside the Live-preview modal (the dialog's translate makes it
// the containing block, and its overflow-hidden the clip box). composerPosition() owns that
// clamp-and-convert math.
import { describe, it, expect } from 'vitest'
import { composerPosition } from '~/lib/annotations/composer-position'

const viewport = { width: 1280, height: 900 }

describe('composerPosition', () => {
  it('no container: passes an in-range position through untouched (viewport coords)', () => {
    expect(composerPosition({ desired: { x: 120, y: 240 }, viewport, container: null }))
      .toEqual({ left: 120, top: 240 })
  })

  it('no container: clamps right/bottom to the viewport with the popover footprint', () => {
    const p = composerPosition({ desired: { x: 5000, y: 5000 }, viewport, container: null })
    expect(p.left).toBe(1280 - 336) // 320px wide + 16px gutter
    expect(p.top).toBe(900 - 220)   // ~204px tall + 16px gutter
  })

  it('tiny viewport: floors at the 16px gutter, never negative', () => {
    const p = composerPosition({ desired: { x: 5000, y: 5000 }, viewport: { width: 300, height: 200 }, container: null })
    expect(p).toEqual({ left: 16, top: 16 })
  })

  it('container (modal): clamps inside the container box and converts to its coordinates', () => {
    const container = { left: 54, top: 54, right: 1206, bottom: 854 }
    // Selection hugging the modal's bottom-right corner (the reported cut-off case).
    const p = composerPosition({ desired: { x: 1100, y: 800 }, viewport, container })
    expect(p.left).toBe(1206 - 336 - 54) // clamped in viewport space, then re-anchored
    expect(p.top).toBe(854 - 220 - 54)
  })

  it('container: an in-range position only shifts into container coordinates', () => {
    const container = { left: 54, top: 54, right: 1206, bottom: 854 }
    expect(composerPosition({ desired: { x: 200, y: 300 }, viewport, container }))
      .toEqual({ left: 146, top: 246 })
  })

  it('container: floor keeps the popover inside the container left/top edge, not the viewport one', () => {
    const container = { left: 54, top: 54, right: 400, bottom: 300 }
    const p = composerPosition({ desired: { x: 5000, y: 5000 }, viewport, container })
    // Upper clamp collapses below the floor → floor wins: 16px inside the CONTAINER edge.
    expect(p.left).toBeGreaterThanOrEqual(16 - 0) // container coords: ≥ gutter
    expect(p.left + 54).toBeGreaterThanOrEqual(54 + 16)
    expect(p.top + 54).toBeGreaterThanOrEqual(54 + 16)
  })
})
