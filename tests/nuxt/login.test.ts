// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { makeDevAdminSession } from '~/lib/dev-auth'
import { canPublish as canPublishFromCodes } from '~/lib/admin-roles'

const loginMock = vi.fn().mockResolvedValue({})
// loginAsDemo returns the synthetic user for the chosen role (the real impl mints the session); the
// page calls navigateTo('/') after. We assert the role wiring here.
const loginAsDemoMock = vi.fn((role: 'author' | 'editor') => makeDevAdminSession(role).user)
mockNuxtImport('useAuth', () => () => ({
  login: loginMock,
  loginAsDemo: loginAsDemoMock,
  logout: vi.fn(),
  isLoggedIn: computed(() => false),
  user: computed(() => null),
  canPublish: computed(() => false),
}))

// Flip demo mode per-describe by mutating the flag the mocked runtimeConfig reads.
let demoModeFlag = false
mockNuxtImport('useRuntimeConfig', () => () => ({
  app: { baseURL: '/' },
  public: { demoMode: demoModeFlag, strapiBaseUrl: 'https://example.invalid', appName: 'Studio' },
}))

// NOTE: mocking navigateTo breaks the global auth middleware in the nuxt test env
// (navigateTo is called by auth.global.ts and replacing it with vi.fn() causes
// "navigateTo is not a function" during app init). Per the task contingency, we
// assert only that login()/loginAsDemo() were called correctly; redirect
// behaviour will be verified manually in the full app.

import LoginPage from '~/pages/login.vue'

describe('login page (normal build)', () => {
  beforeEach(() => { loginMock.mockClear(); demoModeFlag = false })

  it('calls login with the entered credentials', async () => {
    const wrapper = await mountSuspended(LoginPage)
    await wrapper.find('input[type="email"]').setValue('writer@example.com')
    await wrapper.find('input[type="password"]').setValue('secret')
    await wrapper.find('form').trigger('submit.prevent')
    await new Promise((r) => setTimeout(r, 0))
    expect(loginMock).toHaveBeenCalledWith('writer@example.com', 'secret')
  })
})

describe('login page (demo build) — two role entries', () => {
  beforeEach(() => { loginAsDemoMock.mockClear(); demoModeFlag = true })

  it('renders an "Enter as Author" and an "Enter as Editor" button plus the role hint', async () => {
    const wrapper = await mountSuspended(LoginPage)
    const text = wrapper.text()
    expect(text).toContain('Enter as Author')
    expect(text).toContain('Enter as Editor')
    expect(text).toMatch(/Authors draft & preview; editors also publish/i)
  })

  it('"Enter as Author" signs in as a NON-publisher (canPublish false)', async () => {
    const wrapper = await mountSuspended(LoginPage)
    const authorBtn = wrapper.findAll('button').find((b) => b.text().includes('Enter as Author'))!
    await authorBtn.trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(loginAsDemoMock).toHaveBeenCalledWith('author')
    const user = loginAsDemoMock.mock.results[0]!.value
    expect(canPublishFromCodes(user.roles.map((r: { code: string }) => r.code))).toBe(false)
  })

  it('"Enter as Editor" signs in as a PUBLISHER (canPublish true)', async () => {
    const wrapper = await mountSuspended(LoginPage)
    const editorBtn = wrapper.findAll('button').find((b) => b.text().includes('Enter as Editor'))!
    await editorBtn.trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(loginAsDemoMock).toHaveBeenCalledWith('editor')
    const user = loginAsDemoMock.mock.results[0]!.value
    expect(canPublishFromCodes(user.roles.map((r: { code: string }) => r.code))).toBe(true)
  })
})
