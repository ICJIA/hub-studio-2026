import { describe, it, expect } from 'vitest'
import { errorHeading, errorBody } from '~/lib/error-display'

// Audit L-5: production must render a GENERIC body, never error.message; dev may show detail.
describe('errorBody (production info hygiene — audit L-5)', () => {
  it('production: shows a generic message, NOT error.message', () => {
    const body = errorBody({ statusCode: 500, message: 'ECONN /secret/internal/path leaked' }, false)
    expect(body).not.toContain('secret')
    expect(body).not.toContain('ECONN')
    expect(body).toMatch(/something went wrong/i)
    expect(body).toMatch(/dashboard/i)
  })

  it('dev: may surface the thrown message for local debugging', () => {
    expect(errorBody({ statusCode: 500, message: 'boom detail' }, true)).toBe('boom detail')
  })

  it('404 stays generic in both production and dev', () => {
    expect(errorBody({ statusCode: 404, message: 'x' }, false)).toBe('That page does not exist.')
    expect(errorBody({ statusCode: 404, message: 'x' }, true)).toBe('That page does not exist.')
  })

  it('dev with no message falls back to a generic line', () => {
    expect(errorBody({ statusCode: 500 }, true)).toBe('Unexpected error.')
  })
})

describe('errorHeading', () => {
  it('404 → "Page not found", otherwise "Something went wrong"', () => {
    expect(errorHeading({ statusCode: 404 })).toBe('Page not found')
    expect(errorHeading({ statusCode: 500 })).toBe('Something went wrong')
    expect(errorHeading(null)).toBe('Something went wrong')
  })
})
