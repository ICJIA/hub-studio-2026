// tests/unit/edit-conflict.test.ts
import { describe, it, expect } from 'vitest'
import { hasConflict } from '~/lib/edit-conflict'

describe('hasConflict', () => {
  it('is true when the server stamp is newer than the loaded stamp', () => {
    expect(hasConflict('2026-07-16T10:00:00.000Z', '2026-07-16T11:00:00.000Z')).toBe(true)
  })

  it('is false when the stamps are equal', () => {
    expect(hasConflict('2026-07-16T10:00:00.000Z', '2026-07-16T10:00:00.000Z')).toBe(false)
  })

  it('is false when the server stamp is older than the loaded stamp', () => {
    expect(hasConflict('2026-07-16T11:00:00.000Z', '2026-07-16T10:00:00.000Z')).toBe(false)
  })

  it('is false when loadedAt is null (fail-open for legacy records)', () => {
    expect(hasConflict(null, '2026-07-16T10:00:00.000Z')).toBe(false)
  })

  it('is false when serverAt is null', () => {
    expect(hasConflict('2026-07-16T10:00:00.000Z', null)).toBe(false)
  })

  it('is false when both are null', () => {
    expect(hasConflict(null, null)).toBe(false)
  })

  it('is false when loadedAt is undefined', () => {
    expect(hasConflict(undefined, '2026-07-16T10:00:00.000Z')).toBe(false)
  })

  it('is false when serverAt is undefined', () => {
    expect(hasConflict('2026-07-16T10:00:00.000Z', undefined)).toBe(false)
  })

  it('is false when both are undefined', () => {
    expect(hasConflict(undefined, undefined)).toBe(false)
  })
})
