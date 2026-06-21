// tests/nuxt/request-review-prefill.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'

mockNuxtImport('useAuthStore', () => () => ({ jwt: 'caller-jwt', user: { email: 'author@icjia.illinois.gov' }, isLoggedIn: true }))
;(globalThis as Record<string, unknown>).$fetch = vi.fn().mockResolvedValue({ ok: true })

// Swap the profile lookup per-test via this mutable holder.
const profileHolder: { value: { reviewers: string[] } | null } = { value: { reviewers: ['mgr@icjia.illinois.gov', 'lead@icjia.illinois.gov'] } }
mockNuxtImport('useStudioProfile', () => () => ({
  repo: {},
  findByAuthorEmail: vi.fn(async () => profileHolder.value),
}))

import RequestReviewForm from '~/components/RequestReviewForm.vue'

describe('RequestReviewForm — reviewer prefill from the studio-profile', () => {
  it('prefills the reviewer field from the profile reviewers when a profile exists', async () => {
    profileHolder.value = { reviewers: ['mgr@icjia.illinois.gov', 'lead@icjia.illinois.gov'] }
    const wrapper = await mountSuspended(RequestReviewForm, { props: { type: 'article', documentId: 'a1' } })
    await new Promise((r) => setTimeout(r, 0))
    const input = wrapper.find('input')
    expect((input.element as HTMLInputElement).value).toContain('mgr@icjia.illinois.gov')
    expect((input.element as HTMLInputElement).value).toContain('lead@icjia.illinois.gov')
  })

  it('degrades gracefully: no profile ⇒ the reviewer field stays empty (as before)', async () => {
    profileHolder.value = null
    const wrapper = await mountSuspended(RequestReviewForm, { props: { type: 'article', documentId: 'a1' } })
    await new Promise((r) => setTimeout(r, 0))
    const input = wrapper.find('input')
    expect((input.element as HTMLInputElement).value).toBe('')
  })
})
