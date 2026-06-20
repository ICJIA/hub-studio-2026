import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import type { AdminUser } from '~/types/admin'

const mk = (codes: string[], over: Partial<AdminUser> = {}): AdminUser => ({
  id: 1, email: 'chris@e.gov', firstname: 'Chris', lastname: 'Schweda',
  roles: codes.map((c, i) => ({ id: i, name: c, code: c })), ...over,
})

describe('auth store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts logged out', () => {
    const s = useAuthStore()
    expect(s.isLoggedIn).toBe(false)
    expect(s.roleCodes).toEqual([])
    expect(s.canPublish).toBe(false)
  })
  it('setSession stores jwt + user and exposes role codes', () => {
    const s = useAuthStore()
    s.setSession({ jwt: 'jwt-1', user: mk(['strapi-author']) })
    expect(s.isLoggedIn).toBe(true)
    expect(s.roleCodes).toEqual(['strapi-author'])
    expect(s.canPublish).toBe(false)
    expect(s.displayName).toBe('Chris Schweda')
  })
  it('canPublish is true for editor/super-admin', () => {
    const s = useAuthStore()
    s.setSession({ jwt: 'j', user: mk(['strapi-editor']) })
    expect(s.canPublish).toBe(true)
  })
  it('displayName falls back to username then email', () => {
    const s = useAuthStore()
    s.setSession({ jwt: 'j', user: mk([], { firstname: undefined, lastname: undefined, username: 'cschweda' }) })
    expect(s.displayName).toBe('cschweda')
  })
  it('clearSession resets everything', () => {
    const s = useAuthStore()
    s.setSession({ jwt: 'j', user: mk(['strapi-super-admin']) })
    s.clearSession()
    expect(s.isLoggedIn).toBe(false)
    expect(s.jwt).toBeNull()
    expect(s.user).toBeNull()
  })
})
