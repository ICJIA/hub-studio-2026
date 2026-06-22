import { describe, it, expect } from 'vitest'
import { deepFreeze } from '~/lib/freeze-public-config'

// Audit §7 D-2 hardening: deep-freezing runtimeConfig.public removes the in-page toggle that
// would let devtools flip `demoMode` to disarm the demo write-guards. These tests prove the freeze
// is deep (nested objects too), idempotent, ref-preserving, and tolerant of odd inputs.
describe('deepFreeze (audit D-2 — immutable public runtime config)', () => {
  it('freezes the top-level object so demoMode cannot be reassigned', () => {
    const cfg = deepFreeze({ demoMode: true, strapiBaseUrl: '' })
    expect(Object.isFrozen(cfg)).toBe(true)
    // A silent reassignment (non-strict) must NOT take effect.
    try {
      // @ts-expect-error — deliberately attempting a forbidden write
      cfg.demoMode = false
    } catch {
      /* strict mode throws; non-strict no-ops — either way the value must not change */
    }
    expect(cfg.demoMode).toBe(true)
  })

  it('freezes nested objects and arrays (deep, not shallow)', () => {
    const cfg = deepFreeze({ nested: { flag: true }, list: [{ x: 1 }] })
    expect(Object.isFrozen(cfg.nested)).toBe(true)
    expect(Object.isFrozen(cfg.list)).toBe(true)
    expect(Object.isFrozen(cfg.list[0])).toBe(true)
    try {
      // @ts-expect-error — forbidden nested write
      cfg.nested.flag = false
    } catch {
      /* ignore */
    }
    expect(cfg.nested.flag).toBe(true)
  })

  it('returns the SAME reference (freezes in place, does not clone)', () => {
    const obj = { a: 1 }
    expect(deepFreeze(obj)).toBe(obj)
  })

  it('is idempotent on an already-frozen object', () => {
    const obj = Object.freeze({ a: 1 })
    expect(() => deepFreeze(obj)).not.toThrow()
    expect(Object.isFrozen(deepFreeze(obj))).toBe(true)
  })

  it('tolerates null / primitive input (returns it unchanged)', () => {
    expect(deepFreeze(null)).toBe(null)
    expect(deepFreeze(42)).toBe(42)
    expect(deepFreeze('x')).toBe('x')
  })
})
