// tests/nuxt/request-review-form.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'

// Auth store: provide a jwt so the POST attaches a bearer token.
mockNuxtImport('useAuthStore', () => () => ({ jwt: 'caller-jwt', isLoggedIn: true }))

// Mock the same-origin $fetch the form uses to POST the Nitro route.
const fetchMock = vi.fn().mockResolvedValue({ ok: true })
mockNuxtImport('useRequestFetch', () => () => fetchMock) // see note in Step 3
;(globalThis as Record<string, unknown>).$fetch = fetchMock

import RequestReviewForm from '~/components/RequestReviewForm.vue'

describe('RequestReviewForm', () => {
  beforeEach(() => { fetchMock.mockClear(); fetchMock.mockResolvedValue({ ok: true }) })

  it('blocks the POST and shows an error when an email is invalid', async () => {
    const wrapper = await mountSuspended(RequestReviewForm, { props: { type: 'article', documentId: 'a1' } })
    wrapper.vm.$.exposed!.setReviewers('not-an-email')
    await wrapper.vm.$.exposed!.send()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(wrapper.vm.$.exposed!.error.value).toMatch(/email/i)
  })

  it('POSTs /api/request-review with the parsed reviewers, the body, and a bearer token; emits sent', async () => {
    const wrapper = await mountSuspended(RequestReviewForm, { props: { type: 'article', documentId: 'a1' } })
    wrapper.vm.$.exposed!.setReviewers('a@icjia.illinois.gov, b@icjia.illinois.gov')
    wrapper.vm.$.exposed!.setMessage('Please review by Friday.')
    await wrapper.vm.$.exposed!.send()
    await new Promise((r) => setTimeout(r, 0))

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, opts] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/request-review')
    expect(opts.method).toBe('POST')
    expect(opts.body).toEqual({
      type: 'article', documentId: 'a1',
      reviewers: ['a@icjia.illinois.gov', 'b@icjia.illinois.gov'],
      message: 'Please review by Friday.',
    })
    expect(new Headers(opts.headers).get('authorization')).toBe('Bearer caller-jwt')
    expect(wrapper.emitted('sent')).toBeTruthy()
  })

  it('surfaces an error when the POST fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Failed to send the review email.'))
    const wrapper = await mountSuspended(RequestReviewForm, { props: { type: 'article', documentId: 'a1' } })
    wrapper.vm.$.exposed!.setReviewers('a@icjia.illinois.gov')
    await wrapper.vm.$.exposed!.send()
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.vm.$.exposed!.error.value).toMatch(/send/i)
    expect(wrapper.emitted('sent')).toBeFalsy()
  })
})
