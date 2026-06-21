// @vitest-environment nuxt
// Audit M-1: init() clears the session on a DEFINITIVE 403 from /admin/users/me, but KEEPS it on
// a transient/5xx (or network) error. Drives the real useAuth().init() with a real Pinia store and
// a mocked fetchMe (so the real Nuxt $api/router context stays intact) that rejects with a status.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { AdminUser } from '~/types/admin'

// Mock only the lib seam init() funnels through, leaving useNuxtApp()/$api/router untouched.
const fetchMeMock = vi.fn()
vi.mock('~/lib/auth', () => ({
  fetchMe: (...args: unknown[]) => fetchMeMock(...args),
  loginRequest: vi.fn(),
}))

import { useAuth } from '~/composables/useAuth'
import { useAuthStore } from '~/stores/auth'

const user: AdminUser = {
  id: 1, email: 'a@x.gov', firstname: 'A', lastname: 'B',
  roles: [{ id: 1, name: 'strapi-editor', code: 'strapi-editor' }],
}

function seededStore() {
  const store = useAuthStore()
  store.setSession({ jwt: 'real-jwt', user })
  return store
}

describe('useAuth().init() — 403 logout vs 5xx keep (audit M-1)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchMeMock.mockReset()
  })

  it('clears the session on a definitive 403', async () => {
    const store = seededStore()
    fetchMeMock.mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { statusCode: 403 }))
    await useAuth().init()
    expect(store.jwt).toBeNull()
    expect(store.user).toBeNull()
  })

  it('KEEPS the session on a transient 5xx', async () => {
    const store = seededStore()
    fetchMeMock.mockRejectedValueOnce(Object.assign(new Error('Bad gateway'), { statusCode: 502 }))
    await useAuth().init()
    expect(store.jwt).toBe('real-jwt')
    expect(store.user).not.toBeNull()
  })

  it('KEEPS the session on a network error with no status', async () => {
    const store = seededStore()
    fetchMeMock.mockRejectedValueOnce(new Error('network down'))
    await useAuth().init()
    expect(store.jwt).toBe('real-jwt')
  })
})
