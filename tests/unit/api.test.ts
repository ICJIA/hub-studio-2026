import { describe, it, expect } from 'vitest'
import { buildAuthHeaders } from '~/lib/api'

describe('buildAuthHeaders', () => {
  it('adds a Bearer token when present', () => {
    const headers = buildAuthHeaders(new Headers(), 'abc123')
    expect(headers.get('Authorization')).toBe('Bearer abc123')
  })

  it('leaves headers untouched when token is null', () => {
    const headers = buildAuthHeaders(new Headers(), null)
    expect(headers.get('Authorization')).toBeNull()
  })

  it('preserves existing headers', () => {
    const headers = buildAuthHeaders(new Headers({ 'X-Test': '1' }), 'tok')
    expect(headers.get('X-Test')).toBe('1')
    expect(headers.get('Authorization')).toBe('Bearer tok')
  })
})
