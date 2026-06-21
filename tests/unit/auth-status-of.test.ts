import { describe, it, expect } from 'vitest'
import { statusOf } from '~/composables/useAuth'

// Audit M-1: statusOf is the discriminator init() uses — clear on a definitive 403, keep on
// transient/5xx/network errors. Covers the shapes ofetch's FetchError can present.
describe('statusOf (HTTP status extraction from a thrown fetch error)', () => {
  it('reads statusCode (ofetch FetchError)', () => {
    expect(statusOf(Object.assign(new Error('Forbidden'), { statusCode: 403 }))).toBe(403)
  })
  it('reads response.status when statusCode is absent', () => {
    expect(statusOf({ response: { status: 502 } })).toBe(502)
  })
  it('reads a bare status field', () => {
    expect(statusOf({ status: 500 })).toBe(500)
  })
  it('returns undefined for a plain network error with no status', () => {
    expect(statusOf(new Error('network down'))).toBeUndefined()
  })
  it('returns undefined for non-object inputs', () => {
    expect(statusOf(undefined)).toBeUndefined()
    expect(statusOf('nope')).toBeUndefined()
  })
})
