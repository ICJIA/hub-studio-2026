import { describe, it, expect, vi } from 'vitest'
import { handleRequestReview } from '~/lib/request-review-handler'
import type { MailMessage } from '~/lib/review-email'

const config = { mailgunFrom: 'Studio <noreply@studio.example.gov>', publicBaseUrl: 'https://studio.example.gov' }
const okBody = { type: 'article', documentId: 'a1', reviewers: ['reviewer@icjia.illinois.gov'], message: 'Please review.' }

function deps(over: Partial<{ verify: boolean; send: (m: MailMessage) => Promise<void> }> = {}) {
  return {
    verifyCaller: vi.fn().mockResolvedValue(over.verify ?? true),
    sendEmail: vi.fn(over.send ?? (async () => {})),
    config,
  }
}

describe('handleRequestReview (anti-abuse + validation + send)', () => {
  it('401 when no Authorization header is present (not an open relay)', async () => {
    const d = deps()
    const res = await handleRequestReview({ authorization: undefined, body: okBody }, d)
    expect(res.status).toBe(401)
    expect(d.sendEmail).not.toHaveBeenCalled()
  })

  it('401 when the caller token fails the Strapi /admin/users/me check', async () => {
    const d = deps({ verify: false })
    const res = await handleRequestReview({ authorization: 'Bearer bad', body: okBody }, d)
    expect(res.status).toBe(401)
    expect(d.sendEmail).not.toHaveBeenCalled()
  })

  it('400 when a reviewer email is invalid (no send)', async () => {
    const d = deps()
    const res = await handleRequestReview(
      { authorization: 'Bearer good', body: { ...okBody, reviewers: ['bad-address'] } },
      d,
    )
    expect(res.status).toBe(400)
    expect(d.sendEmail).not.toHaveBeenCalled()
  })

  it('400 when the body shape is wrong (bad type / empty reviewers / missing documentId)', async () => {
    const d = deps()
    expect((await handleRequestReview({ authorization: 'Bearer good', body: { ...okBody, type: 'nope' } }, d)).status).toBe(400)
    expect((await handleRequestReview({ authorization: 'Bearer good', body: { ...okBody, reviewers: [] } }, d)).status).toBe(400)
    expect((await handleRequestReview({ authorization: 'Bearer good', body: { ...okBody, documentId: '' } }, d)).status).toBe(400)
    expect(d.sendEmail).not.toHaveBeenCalled()
  })

  it('400 when documentId contains characters outside [A-Za-z0-9_-] (boundary validation)', async () => {
    const d = deps()
    // HTML/URL-special chars must be rejected at the boundary
    expect((await handleRequestReview({ authorization: 'Bearer good', body: { ...okBody, documentId: 'abc<script>' } }, d)).status).toBe(400)
    expect((await handleRequestReview({ authorization: 'Bearer good', body: { ...okBody, documentId: 'abc def' } }, d)).status).toBe(400)
    expect((await handleRequestReview({ authorization: 'Bearer good', body: { ...okBody, documentId: 'abc/def' } }, d)).status).toBe(400)
    expect((await handleRequestReview({ authorization: 'Bearer good', body: { ...okBody, documentId: 'abc&def' } }, d)).status).toBe(400)
    // Valid alphanumeric + underscore + hyphen IDs must pass
    expect((await handleRequestReview({ authorization: 'Bearer good', body: { ...okBody, documentId: 'abc-123_XYZ' } }, d)).status).toBe(200)
    expect(d.sendEmail).toHaveBeenCalledOnce()
  })

  it('happy path: 200 and sendEmail receives a message carrying the exact preview link', async () => {
    const d = deps()
    const res = await handleRequestReview({ authorization: 'Bearer good', body: okBody }, d)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(d.sendEmail).toHaveBeenCalledOnce()
    const msg = (d.sendEmail as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as MailMessage
    expect(msg.text).toContain('https://studio.example.gov/preview/article/a1')
    expect(msg.to).toEqual(['reviewer@icjia.illinois.gov'])
  })

  it('502 when Mailgun send throws', async () => {
    const d = deps({ send: async () => { throw new Error('Mailgun send failed (401).') } })
    const res = await handleRequestReview({ authorization: 'Bearer good', body: okBody }, d)
    expect(res.status).toBe(502)
  })
})
