import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Audit H-1: assert the Netlify public/_headers file ships the security-hardening header set,
// in particular the tight connect-src (the blast-radius control), frame-ancestors, and nosniff.
const headers = readFileSync(
  fileURLToPath(new URL('../../public/_headers', import.meta.url)),
  'utf8',
)

describe('public/_headers (security headers — audit H-1)', () => {
  it('locks connect-src to self + the Strapi admin host + Mailgun', () => {
    expect(headers).toContain('connect-src')
    expect(headers).toContain('https://v2.hub.icjia-api.cloud')
    expect(headers).toContain('https://api.mailgun.net')
  })

  it("sets frame-ancestors 'none' (anti-framing) in the CSP", () => {
    expect(headers).toMatch(/frame-ancestors\s+'none'/)
  })

  it('sets X-Content-Type-Options: nosniff', () => {
    expect(headers).toMatch(/X-Content-Type-Options:\s*nosniff/)
  })

  it('ships the rest of the hardening set (XFO, Referrer-Policy, HSTS, CSP)', () => {
    expect(headers).toMatch(/X-Frame-Options:\s*DENY/)
    expect(headers).toMatch(/Referrer-Policy:\s*strict-origin-when-cross-origin/)
    expect(headers).toMatch(/Strict-Transport-Security:\s*max-age=31536000; includeSubDomains/)
    expect(headers).toContain('Content-Security-Policy:')
    expect(headers).toMatch(/object-src\s+'none'/)
    expect(headers).toMatch(/base-uri\s+'none'/)
  })

  it("does NOT use 'unsafe-inline' for script-src (would defeat the CSP)", () => {
    // The CSP directive line must not weaken script-src; tolerate 'unsafe-inline' on style-src.
    const cspLine = headers.split('\n').find((l) => l.includes('Content-Security-Policy:')) ?? ''
    const scriptSrc = /script-src([^;]*)/.exec(cspLine)?.[1] ?? ''
    expect(scriptSrc).not.toContain('unsafe-inline')
  })
})
