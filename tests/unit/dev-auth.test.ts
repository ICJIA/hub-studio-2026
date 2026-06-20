import { describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  DEV_ADMIN_IDENTIFIER,
  DEV_ADMIN_PASSWORD,
  DEV_ADMIN_TOKEN,
  matchesDevAdmin,
  isDevAdminToken,
  makeDevAdminSession,
} from '~/lib/dev-auth'
import { useAuthStore } from '~/stores/auth'

describe('matchesDevAdmin', () => {
  it('matches the fixed dev admin credentials', () => {
    expect(matchesDevAdmin(DEV_ADMIN_IDENTIFIER, DEV_ADMIN_PASSWORD)).toBe(true)
  })

  it('rejects a wrong password', () => {
    expect(matchesDevAdmin(DEV_ADMIN_IDENTIFIER, 'nope')).toBe(false)
  })

  it('rejects a different identifier', () => {
    expect(matchesDevAdmin('someone@example.com', DEV_ADMIN_PASSWORD)).toBe(false)
  })

  it('does not match real Strapi credentials', () => {
    expect(matchesDevAdmin('boss@example.com', 's3cret')).toBe(false)
  })
})

describe('isDevAdminToken', () => {
  it('recognises the synthetic dev token', () => {
    expect(isDevAdminToken(DEV_ADMIN_TOKEN)).toBe(true)
  })

  it('rejects a real-looking jwt', () => {
    expect(isDevAdminToken('eyJhbGciOiJIUzI1NiJ9.real.jwt')).toBe(false)
  })

  it('rejects null', () => {
    expect(isDevAdminToken(null)).toBe(false)
  })
})

describe('makeDevAdminSession', () => {
  it('carries the sentinel token and an admin role', () => {
    const session = makeDevAdminSession()
    expect(session.jwt).toBe(DEV_ADMIN_TOKEN)
    expect(session.user.role?.name).toBe('admin')
  })

  it('grants a logged-in admin session through the real auth store', () => {
    setActivePinia(createPinia())
    const store = useAuthStore()
    const session = makeDevAdminSession()
    store.setSession(session)
    expect(store.isLoggedIn).toBe(true)
    expect(store.isAdmin).toBe(true)
  })
})
