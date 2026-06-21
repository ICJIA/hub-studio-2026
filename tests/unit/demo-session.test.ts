// tests/unit/demo-session.test.ts
// isDemoSession delegates to isDevAdminToken(useAuthStore().jwt) when the context honors the
// synthetic token (import.meta.dev OR isDemoMode). isDemoMode reads runtimeConfig, which needs a
// Nuxt context — so the full isDemoSession/isDemoMode behavior is covered in the nuxt-env test
// tests/nuxt/demo-mode.test.ts. Here we test the underlying isDevAdminToken + store integration.
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { DEV_ADMIN_TOKEN, isDevAdminToken } from '~/lib/dev-auth'
import { useAuthStore } from '~/stores/auth'

// Test the underlying isDevAdminToken function with store values.
// isDemoSession() wraps this with an import.meta.dev guard — we test that guard
// separately using the logic: if import.meta.dev is false, isDemoSession() returns false.

describe('isDemoSession — via isDevAdminToken + store integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('isDevAdminToken returns true for the dev admin token', () => {
    expect(isDevAdminToken(DEV_ADMIN_TOKEN)).toBe(true)
  })

  it('isDevAdminToken returns false for a real jwt', () => {
    expect(isDevAdminToken('real.jwt.token')).toBe(false)
  })

  it('isDevAdminToken returns false for null (not logged in)', () => {
    expect(isDevAdminToken(null)).toBe(false)
  })

  it('store jwt is the dev admin token after setSession with DEV_ADMIN_TOKEN', () => {
    const store = useAuthStore()
    store.setSession({
      jwt: DEV_ADMIN_TOKEN,
      user: { id: 0, username: 'admin', email: 'dev-admin@localhost', firstname: 'Dev', lastname: 'Admin', isActive: true, blocked: false, roles: [] },
    })
    expect(isDevAdminToken(store.jwt)).toBe(true)
  })

  it('store jwt is not the dev admin token after setSession with real jwt', () => {
    const store = useAuthStore()
    store.setSession({
      jwt: 'real.jwt.token',
      user: { id: 1, username: 'real', email: 'real@example.com', firstname: 'Real', lastname: 'User', isActive: true, blocked: false, roles: [] },
    })
    expect(isDevAdminToken(store.jwt)).toBe(false)
  })

  it('store jwt is null after clearSession, isDevAdminToken returns false', () => {
    const store = useAuthStore()
    store.clearSession()
    expect(isDevAdminToken(store.jwt)).toBe(false)
  })

  it('the synthetic token gates the demo session only when the context honors it', () => {
    // The decision is `(import.meta.dev || isDemoMode()) && isDevAdminToken(jwt)`. The token half
    // is what we assert here (the context half is covered in tests/nuxt/demo-mode.test.ts): a real
    // jwt is NEVER a demo session regardless of context, and the synthetic token is the only one
    // that can be.
    const store = useAuthStore()
    store.setSession({
      jwt: 'real.jwt.token',
      user: { id: 1, username: 'real', email: 'real@example.com', firstname: 'Real', lastname: 'User', isActive: true, blocked: false, roles: [] },
    })
    expect(isDevAdminToken(store.jwt)).toBe(false)
    store.setSession({
      jwt: DEV_ADMIN_TOKEN,
      user: { id: 0, username: 'admin', email: 'dev-admin@localhost', firstname: 'Dev', lastname: 'Admin', isActive: true, blocked: false, roles: [] },
    })
    expect(isDevAdminToken(store.jwt)).toBe(true)
  })
})
