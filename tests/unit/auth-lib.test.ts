import { describe, it, expect, vi } from 'vitest'
import { loginRequest, fetchMe } from '~/lib/auth'
import type { $Fetch } from 'ofetch'

describe('loginRequest', () => {
  it('POSTs identifier/password to /api/auth/local and returns the body', async () => {
    const fake = { jwt: 'jwt-x', user: { id: 1, username: 'u', email: 'u@e.com' } }
    const api = vi.fn().mockResolvedValue(fake) as unknown as $Fetch
    const result = await loginRequest(api, 'u@e.com', 'secret')
    expect(api).toHaveBeenCalledWith('/api/auth/local', {
      method: 'POST',
      body: { identifier: 'u@e.com', password: 'secret' },
    })
    expect(result).toBe(fake)
  })
})

describe('fetchMe', () => {
  it('GETs /api/users/me with role populated', async () => {
    const me = { id: 1, username: 'u', email: 'u@e.com', role: { id: 2, name: 'author', type: 'author' } }
    const api = vi.fn().mockResolvedValue(me) as unknown as $Fetch
    const result = await fetchMe(api)
    expect(api).toHaveBeenCalledWith('/api/users/me', { query: { populate: 'role' } })
    expect(result).toBe(me)
  })
})
