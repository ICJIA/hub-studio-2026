// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'

const loginMock = vi.fn().mockResolvedValue({})
mockNuxtImport('useAuth', () => () => ({
  login: loginMock,
  logout: vi.fn(),
  isLoggedIn: computed(() => false),
  user: computed(() => null),
  canPublish: computed(() => false),
}))

// NOTE: mocking navigateTo breaks the global auth middleware in the nuxt test env
// (navigateTo is called by auth.global.ts and replacing it with vi.fn() causes
// "navigateTo is not a function" during app init). Per the task contingency, we
// assert only that login() was called with the correct credentials; redirect
// behaviour will be verified manually in the full app (Task 7).

import LoginPage from '~/pages/login.vue'

describe('login page', () => {
  beforeEach(() => {
    loginMock.mockClear()
  })

  it('calls login with the entered credentials', async () => {
    const wrapper = await mountSuspended(LoginPage)
    await wrapper.find('input[type="email"]').setValue('writer@example.com')
    await wrapper.find('input[type="password"]').setValue('secret')
    await wrapper.find('form').trigger('submit.prevent')
    await new Promise((r) => setTimeout(r, 0))
    expect(loginMock).toHaveBeenCalledWith('writer@example.com', 'secret')
  })
})
