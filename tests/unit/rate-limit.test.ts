import { describe, it, expect } from 'vitest'
import { createRateLimiter } from '~/lib/rate-limit'

describe('createRateLimiter (fixed-window, per-instance — audit M-5)', () => {
  it('allows the first 5 hits and blocks the 6th within the window', () => {
    let now = 1_000
    const rl = createRateLimiter({ max: 5, windowMs: 10 * 60 * 1000, now: () => now })
    const results = Array.from({ length: 6 }, () => rl.hit('user:1').allowed)
    expect(results).toEqual([true, true, true, true, true, false])
  })

  it('resets the allowance after the window elapses', () => {
    let now = 0
    const windowMs = 10 * 60 * 1000
    const rl = createRateLimiter({ max: 5, windowMs, now: () => now })
    for (let i = 0; i < 5; i++) rl.hit('user:1')
    expect(rl.hit('user:1').allowed).toBe(false) // 6th blocked
    now += windowMs // advance past the window
    expect(rl.hit('user:1').allowed).toBe(true) // fresh window
  })

  it('tracks each key independently', () => {
    let now = 0
    const rl = createRateLimiter({ max: 5, windowMs: 1000, now: () => now })
    for (let i = 0; i < 5; i++) rl.hit('user:1')
    expect(rl.hit('user:1').allowed).toBe(false) // user:1 exhausted
    expect(rl.hit('user:2').allowed).toBe(true) // user:2 unaffected
  })

  it('reports remaining and resetAt on each hit', () => {
    const rl = createRateLimiter({ max: 5, windowMs: 1000, now: () => 500 })
    const first = rl.hit('k')
    expect(first).toEqual({ allowed: true, remaining: 4, resetAt: 1500 })
    const blockedAfter = Array.from({ length: 5 }, () => rl.hit('k')).pop()!
    expect(blockedAfter.allowed).toBe(false)
    expect(blockedAfter.remaining).toBe(0)
  })

  it('reset(key) drops the bucket so the key starts fresh', () => {
    let now = 0
    const rl = createRateLimiter({ max: 1, windowMs: 1000, now: () => now })
    expect(rl.hit('k').allowed).toBe(true)
    expect(rl.hit('k').allowed).toBe(false)
    rl.reset('k')
    expect(rl.hit('k').allowed).toBe(true)
  })
})
