import { describe, it, expect, vi } from 'vitest'
import { buildReviewEmail, sendViaMailgun, isValidEmail } from '~/lib/review-email'

describe('isValidEmail', () => {
  it('accepts a normal address and rejects malformed ones', () => {
    expect(isValidEmail('reviewer@icjia.illinois.gov')).toBe(true)
    expect(isValidEmail('no-at-sign')).toBe(false)
    expect(isValidEmail('two@@signs.com')).toBe(false)
    expect(isValidEmail('spaces in@domain.com')).toBe(false)
    expect(isValidEmail('missing@tld')).toBe(false)
  })
})

describe('buildReviewEmail', () => {
  const base = {
    type: 'article' as const,
    documentId: 'a1',
    reviewers: ['reviewer@icjia.illinois.gov'],
    baseUrl: 'https://studio.example.gov',
    from: 'Studio <noreply@studio.example.gov>',
  }

  it('builds a message whose text AND html contain the exact /preview/:type/:documentId link', () => {
    const msg = buildReviewEmail({ ...base, message: 'Please review by Friday.' })
    const link = 'https://studio.example.gov/preview/article/a1'
    expect(msg.to).toEqual(['reviewer@icjia.illinois.gov'])
    expect(msg.from).toBe(base.from)
    expect(msg.text).toContain(link)
    expect(msg.html).toContain(link)
    expect(msg.text).toContain('Please review by Friday.')
  })

  it('strips a trailing slash on baseUrl so the preview URL is well-formed', () => {
    const msg = buildReviewEmail({ ...base, baseUrl: 'https://studio.example.gov/' })
    expect(msg.text).toContain('https://studio.example.gov/preview/article/a1')
    expect(msg.text).not.toContain('//preview')
  })

  it('throws when any reviewer address is invalid (→ the route returns 400)', () => {
    expect(() => buildReviewEmail({ ...base, reviewers: ['ok@x.com', 'bad-address'] })).toThrow(/email/i)
  })

  it('percent-encodes documentId in both text and HTML bodies, and HTML-escapes the URL for safety', () => {
    const msg = buildReviewEmail({ ...base, documentId: 'a"b<c' })
    // Path segment is percent-encoded: a"b<c → a%22b%3Cc
    const encodedLink = 'https://studio.example.gov/preview/article/a%22b%3Cc'
    const htmlEscapedLink = 'https://studio.example.gov/preview/article/a%22b%3Cc'

    // Text body should contain the percent-encoded URL (clickable and safe)
    expect(msg.text).toContain(encodedLink)
    // HTML body href should be HTML-escaped (percent-encoded chars are safe, but belt-and-suspenders)
    expect(msg.html).toContain(`href="${htmlEscapedLink}"`)
    // HTML body code tag should also show the HTML-escaped form
    expect(msg.html).toContain(`<code>${htmlEscapedLink}</code>`)
    // HTML body must NOT contain raw unencoded special chars from the documentId
    expect(msg.html).not.toContain('a"b<c')
  })
})

describe('sendViaMailgun (direct HTTP, no SDK)', () => {
  const msg = {
    to: ['reviewer@icjia.illinois.gov'],
    from: 'Studio <noreply@studio.example.gov>',
    subject: 'Review request',
    text: 'link',
    html: '<p>link</p>',
  }

  it('POSTs the Mailgun messages endpoint with Basic auth and a form body of recipients', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 }) as unknown as typeof fetch
    await sendViaMailgun(fetchImpl, { domain: 'mg.example.gov', apiKey: 'key-XYZ' }, msg)

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('https://api.mailgun.net/v3/mg.example.gov/messages')
    expect(init.method).toBe('POST')

    // HTTP Basic auth: api:{apiKey}
    const expectedAuth = `Basic ${Buffer.from('api:key-XYZ').toString('base64')}`
    const headers = new Headers(init.headers)
    expect(headers.get('authorization')).toBe(expectedAuth)

    // Form body carries from/to/subject/text/html.
    const body = init.body as URLSearchParams
    expect(body.get('from')).toBe(msg.from)
    expect(body.get('to')).toBe('reviewer@icjia.illinois.gov')
    expect(body.get('subject')).toBe('Review request')
    expect(body.get('text')).toBe('link')
    expect(body.get('html')).toBe('<p>link</p>')
  })

  it('throws on a non-2xx Mailgun response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'Unauthorized' }) as unknown as typeof fetch
    await expect(sendViaMailgun(fetchImpl, { domain: 'mg.example.gov', apiKey: 'bad' }, msg)).rejects.toThrow(/mailgun/i)
  })
})
