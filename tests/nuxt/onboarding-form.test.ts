// tests/nuxt/onboarding-form.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { StudioProfile } from '~/types/studio-profile'

// useAuth provides the prefilled author email.
mockNuxtImport('useAuth', () => () => ({
  user: computed(() => ({ email: 'author@icjia.illinois.gov' })),
  canPublish: computed(() => false),
  isLoggedIn: computed(() => true),
}))

// useAuthStore provides the setHasProfile spy the page calls on success.
const setHasProfile = vi.fn()
mockNuxtImport('useAuthStore', () => () => ({ setHasProfile, user: { email: 'author@icjia.illinois.gov' } }))

// useStudioProfile provides the create spy (no network).
const createMock = vi.fn(async (m: StudioProfile): Promise<StudioProfile> => ({ ...m, documentId: 'p-new' }))
mockNuxtImport('useStudioProfile', () => () => ({
  repo: { list: vi.fn(), findOne: vi.fn(), create: createMock, update: vi.fn(), remove: vi.fn(), publish: vi.fn() },
  findByAuthorEmail: vi.fn(),
}))

import OnboardingPage from '~/pages/onboarding.vue'

describe('onboarding page', () => {
  beforeEach(() => { createMock.mockClear(); setHasProfile.mockClear() })

  it('prefills the author email as read-only', async () => {
    const wrapper = await mountSuspended(OnboardingPage)
    expect(wrapper.vm.$.exposed!.authorEmail.value).toBe('author@icjia.illinois.gov')
    // The email input is rendered disabled/readonly (not editable).
    const emailInput = wrapper.find('input[readonly], input[disabled]')
    expect(emailInput.exists()).toBe(true)
  })

  it('blocks create when reviewers are empty or invalid', async () => {
    const wrapper = await mountSuspended(OnboardingPage)
    wrapper.vm.$.exposed!.setCenter('Research & Analysis')
    // no reviewers
    await wrapper.vm.$.exposed!.submit()
    expect(createMock).not.toHaveBeenCalled()
    expect(wrapper.vm.$.exposed!.errors.value.some((e: { field: string }) => e.field === 'reviewers')).toBe(true)

    // invalid reviewer
    wrapper.vm.$.exposed!.setReviewers(['not-an-email'])
    await wrapper.vm.$.exposed!.submit()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('on a clean submit, creates the profile and flips hasProfile to true', async () => {
    const wrapper = await mountSuspended(OnboardingPage)
    wrapper.vm.$.exposed!.setReviewers(['mgr@icjia.illinois.gov'])
    wrapper.vm.$.exposed!.setCenter('Research & Analysis')
    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))

    expect(createMock).toHaveBeenCalledOnce()
    expect(createMock.mock.calls[0]![0]).toMatchObject({
      authorEmail: 'author@icjia.illinois.gov',
      reviewers: ['mgr@icjia.illinois.gov'],
      center: 'Research & Analysis',
    })
    expect(setHasProfile).toHaveBeenCalledWith(true)
  })
})
