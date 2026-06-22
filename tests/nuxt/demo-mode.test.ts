// @vitest-environment nuxt
// Security-critical: the public demo build (NUXT_PUBLIC_DEMO_MODE=true ⇒ runtimeConfig.public
// .demoMode) must be fully self-contained — demo login only, in-memory content, ZERO Strapi
// writes, no secrets. demoMode=false must leave EVERY path 100% unchanged. We flip demoMode via
// a mutable backing the mocked useRuntimeConfig, and drive the REAL useAuth()/createRepository().
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import type { $Fetch } from 'ofetch'
import { DEV_ADMIN_IDENTIFIER, DEV_ADMIN_PASSWORD, DEV_ADMIN_TOKEN } from '~/lib/dev-auth'

// Mutable demo flag the mocked useRuntimeConfig reads, so a single file can exercise true AND false.
// NOTE: Nuxt internals (the router plugin) also read useRuntimeConfig().app.baseURL during app
// init, so the mock must carry that field too — otherwise app setup throws before any test runs.
let demoModeFlag = false
mockNuxtImport('useRuntimeConfig', () => () => ({
  app: { baseURL: '/' },
  public: { demoMode: demoModeFlag, strapiBaseUrl: 'https://example.invalid', appName: 'Studio' },
}))

// Mock the real-login lib seam so we can assert it is NEVER reached in demo mode (and IS used otherwise),
// without any network. loginRequest resolving proves the non-demo path still calls it.
const loginRequestMock = vi.fn().mockResolvedValue({ jwt: 'real-jwt', user: { id: 1, email: 'a@x.gov', roles: [] } })
const fetchMeMock = vi.fn().mockResolvedValue({ id: 1, email: 'a@x.gov', roles: [] })
vi.mock('~/lib/auth', () => ({
  loginRequest: (...a: unknown[]) => loginRequestMock(...a),
  fetchMe: (...a: unknown[]) => fetchMeMock(...a),
}))
// Keep the profile-gate side effect inert (it would otherwise hit useStudioProfile()/$api).
vi.mock('~/lib/profile-gate', () => ({ resolveHasProfile: vi.fn().mockResolvedValue(null) }))

import { useAuth } from '~/composables/useAuth'
import { useAuthStore } from '~/stores/auth'
import { isDemoMode, isDemoSession } from '~/lib/demo'
import { createRepository } from '~/lib/repository'

// A minimal repository over a spying $api — any write reaching $api would be a SECURITY FAILURE in demo mode.
interface Dom { documentId: string; title: string }
function makeRepoWithSpy() {
  const api = vi.fn().mockResolvedValue({ data: { documentId: 'a', title: 'x' }, results: [], pagination: {} }) as unknown as $Fetch
  const repo = createRepository<Dom, Dom, { title: string }>({
    api, uid: 'api::article.article', relationFields: [],
    fromStrapi: (r) => r, toWrite: (d) => ({ title: d.title }),
  })
  return { api, repo }
}

beforeEach(() => {
  setActivePinia(createPinia())
  loginRequestMock.mockClear()
  fetchMeMock.mockClear()
  demoModeFlag = false
})

describe('demo mode ON (NUXT_PUBLIC_DEMO_MODE=true)', () => {
  beforeEach(() => { demoModeFlag = true })

  it('isDemoMode() is true', () => {
    expect(isDemoMode()).toBe(true)
  })

  it('login() REJECTS real credentials and never calls the real loginRequest', async () => {
    await expect(useAuth().login('real@x.gov', 's3cret')).rejects.toThrow(/demo mode/i)
    expect(loginRequestMock).not.toHaveBeenCalled()
    expect(useAuthStore().isLoggedIn).toBe(false)
  })

  it('login() ACCEPTS the demo admin credentials (synthetic session, no network)', async () => {
    await useAuth().login(DEV_ADMIN_IDENTIFIER, DEV_ADMIN_PASSWORD)
    expect(loginRequestMock).not.toHaveBeenCalled()
    const store = useAuthStore()
    expect(store.jwt).toBe(DEV_ADMIN_TOKEN)
    expect(store.isLoggedIn).toBe(true)
    expect(store.canPublish).toBe(true)
  })

  it('isDemoSession() is true once the synthetic demo token is active', () => {
    expect(isDemoSession()).toBe(false) // no session yet
    useAuthStore().setSession({
      jwt: DEV_ADMIN_TOKEN,
      user: { id: 0, username: 'admin', email: 'dev-admin@localhost', firstname: 'Dev', lastname: 'Admin', isActive: true, blocked: false, roles: [] },
    })
    expect(isDemoSession()).toBe(true)
  })

  it('repository create()/update()/remove()/publish()/unpublish() THROW before any $api call (hard write-block)', async () => {
    const { api, repo } = makeRepoWithSpy()
    await expect(repo.create({ documentId: '', title: 'x' })).rejects.toThrow(/demo mode: writes are disabled/i)
    await expect(repo.update('a', { documentId: 'a', title: 'x' })).rejects.toThrow(/demo mode: writes are disabled/i)
    await expect(repo.remove('a')).rejects.toThrow(/demo mode: writes are disabled/i)
    await expect(repo.publish('a')).rejects.toThrow(/demo mode: writes are disabled/i)
    await expect(repo.unpublish('a')).rejects.toThrow(/demo mode: writes are disabled/i)
    expect(api).not.toHaveBeenCalled() // CRITICAL: no write ever reached Strapi
  })

  it('repository reads are still allowed (list does NOT throw)', async () => {
    const { api, repo } = makeRepoWithSpy()
    await expect(repo.list()).resolves.toBeDefined()
    expect(api).toHaveBeenCalled()
  })
})

describe('demo mode OFF (default) — behavior is unchanged', () => {
  it('isDemoMode() is false', () => {
    expect(isDemoMode()).toBe(false)
  })

  it('login() uses the REAL loginRequest for normal credentials', async () => {
    await useAuth().login('real@x.gov', 's3cret')
    expect(loginRequestMock).toHaveBeenCalledOnce()
    // Assert the credentials are forwarded (the first arg is the $api client).
    const [, email, password] = loginRequestMock.mock.calls[0]!
    expect([email, password]).toEqual(['real@x.gov', 's3cret'])
    expect(useAuthStore().jwt).toBe('real-jwt')
  })

  it('isDemoSession() is false even with the synthetic token (not dev, not demo)', () => {
    useAuthStore().setSession({
      jwt: DEV_ADMIN_TOKEN,
      user: { id: 0, username: 'admin', email: 'dev-admin@localhost', firstname: 'Dev', lastname: 'Admin', isActive: true, blocked: false, roles: [] },
    })
    expect(isDemoSession()).toBe(false)
  })

  it('repository create()/update() proceed to $api (writes are NOT blocked)', async () => {
    const { api, repo } = makeRepoWithSpy()
    await repo.create({ documentId: '', title: 'x' })
    await repo.update('a', { documentId: 'a', title: 'y' })
    expect(api).toHaveBeenCalledTimes(2)
  })
})
