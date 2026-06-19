import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import type { StrapiUser } from '~/types/strapi'

const adminUser: StrapiUser = {
  id: 1, username: 'boss', email: 'boss@example.com',
  role: { id: 1, name: 'admin', type: 'admin' },
}
const authorUser: StrapiUser = {
  id: 2, username: 'writer', email: 'writer@example.com',
  role: { id: 2, name: 'author', type: 'author' },
}

describe('auth store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts logged out', () => {
    const s = useAuthStore()
    expect(s.isLoggedIn).toBe(false)
    expect(s.role).toBeNull()
    expect(s.isAdmin).toBe(false)
  })

  it('setSession stores jwt + user and marks logged in', () => {
    const s = useAuthStore()
    s.setSession({ jwt: 'jwt-1', user: authorUser })
    expect(s.isLoggedIn).toBe(true)
    expect(s.jwt).toBe('jwt-1')
    expect(s.role).toBe('author')
    expect(s.isAdmin).toBe(false)
  })

  it('isAdmin is true only for the admin role', () => {
    const s = useAuthStore()
    s.setSession({ jwt: 'jwt-2', user: adminUser })
    expect(s.isAdmin).toBe(true)
  })

  it('setUser updates the user without touching the jwt', () => {
    const s = useAuthStore()
    s.setSession({ jwt: 'jwt-3', user: authorUser })
    s.setUser(adminUser)
    expect(s.jwt).toBe('jwt-3')
    expect(s.role).toBe('admin')
  })

  it('clearSession resets everything', () => {
    const s = useAuthStore()
    s.setSession({ jwt: 'jwt-4', user: adminUser })
    s.clearSession()
    expect(s.isLoggedIn).toBe(false)
    expect(s.jwt).toBeNull()
    expect(s.user).toBeNull()
  })
})
