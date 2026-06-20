import { describe, it, expect, vi } from 'vitest'
import { loginRequest, fetchMe } from '~/lib/auth'
import type { $Fetch } from 'ofetch'

describe('loginRequest', () => {
  it('POSTs email/password to /admin/login and returns token + user', async () => {
    const fake = { data: { token: 'jwt-x', user: { id: 1, email: 'a@b.gov', roles: [] } } }
    const api = vi.fn().mockResolvedValue(fake) as unknown as $Fetch
    const result = await loginRequest(api, 'a@b.gov', 'secret')
    expect(api).toHaveBeenCalledWith('/admin/login', { method: 'POST', body: { email: 'a@b.gov', password: 'secret' } })
    expect(result).toEqual({ jwt: 'jwt-x', user: { id: 1, email: 'a@b.gov', roles: [] } })
  })
})

describe('fetchMe', () => {
  it('GETs /admin/users/me and unwraps data (user with roles)', async () => {
    const me = { data: { id: 1, email: 'a@b.gov', roles: [{ id: 1, name: 'Super Admin', code: 'strapi-super-admin' }] } }
    const api = vi.fn().mockResolvedValue(me) as unknown as $Fetch
    const result = await fetchMe(api)
    expect(api).toHaveBeenCalledWith('/admin/users/me')
    expect(result.roles[0].code).toBe('strapi-super-admin')
  })
})
