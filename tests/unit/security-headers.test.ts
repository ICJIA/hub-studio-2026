import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Audit H-1: assert the Netlify public/_headers file ships the security-hardening header set,
// in particular the tight connect-src (the blast-radius control), frame-ancestors, and nosniff.
const headers = readFileSync(
  fileURLToPath(new URL('../../public/_headers', import.meta.url)),
  'utf8',
)

// Audit §7 (D-2/D-3/D-8): the PUBLIC DEMO header set (copied over _headers by netlify.toml at
// build) is the demo's authoritative, JS-independent backstop. Its `connect-src 'self'` makes the
// real Strapi/Mailgun/Iconify hosts unreachable from the browser EVEN IF every JS guard is
// bypassed — so a regression here (any non-'self' connect-src entry) would silently re-open the
// demo's network surface. Guard it in CI alongside the production set.
const demoHeaders = readFileSync(
  fileURLToPath(new URL('../../deploy/headers-demo.txt', import.meta.url)),
  'utf8',
)
/** Extract the bare connect-src value from a `_headers`-style CSP line. */
function connectSrcOf(text: string): string {
  const cspLine = text.split('\n').find((l) => l.includes('Content-Security-Policy:')) ?? ''
  return (/connect-src([^;]*)/.exec(cspLine)?.[1] ?? '').trim()
}

/** Extract the bare img-src value from a `_headers`-style CSP line. */
function imgSrcOf(headerText: string): string {
  const cspLine = headerText.split('\n').find((l) => l.includes('Content-Security-Policy:')) ?? ''
  return (/img-src([^;]*)/.exec(cspLine)?.[1] ?? '').trim()
}

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

  it('production img-src does NOT permit blob: — live never renders object URLs', () => {
    expect(imgSrcOf(headers)).not.toContain('blob:')
    expect(imgSrcOf(headers)).toContain("'self'")
  })
})

describe('search-engine exclusion (internal tool on a public URL — runbook §3 hardening)', () => {
  it('production headers send X-Robots-Tag: noindex on every response', () => {
    expect(headers).toMatch(/X-Robots-Tag:\s*noindex/)
  })

  it('demo headers send X-Robots-Tag: noindex on every response', () => {
    expect(demoHeaders).toMatch(/X-Robots-Tag:\s*noindex/)
  })

  it('public/robots.txt exists and disallows all crawling', () => {
    const robots = readFileSync(
      fileURLToPath(new URL('../../public/robots.txt', import.meta.url)),
      'utf8',
    )
    expect(robots).toMatch(/User-agent:\s*\*/)
    expect(robots).toMatch(/Disallow:\s*\/$/m)
  })
})

describe('deploy/headers-demo.txt (public-demo backstop — audit §7 D-2/D-3/D-8)', () => {
  it("locks connect-src to EXACTLY 'self' — no Strapi/Mailgun/Iconify host (the network backstop)", () => {
    const connectSrc = connectSrcOf(demoHeaders)
    expect(connectSrc).toBe("'self'")
    // Explicit negatives: a regression that re-adds any of these would silently re-open the demo.
    expect(connectSrc).not.toContain('http')
    expect(demoHeaders).not.toContain('v2.hub.icjia-api.cloud')
    expect(demoHeaders).not.toContain('api.iconify.design')
    expect(demoHeaders).not.toContain('api.mailgun.net')
  })

  it('ships the full hardening set (nosniff, XFO, Referrer-Policy, Permissions-Policy, HSTS, CSP)', () => {
    expect(demoHeaders).toMatch(/X-Content-Type-Options:\s*nosniff/)
    expect(demoHeaders).toMatch(/X-Frame-Options:\s*DENY/)
    expect(demoHeaders).toMatch(/Referrer-Policy:\s*strict-origin-when-cross-origin/)
    expect(demoHeaders).toMatch(/Permissions-Policy:\s*camera=\(\)/)
    expect(demoHeaders).toMatch(/Strict-Transport-Security:\s*max-age=31536000; includeSubDomains/)
    expect(demoHeaders).toContain('Content-Security-Policy:')
    expect(demoHeaders).toMatch(/object-src\s+'none'/)
    expect(demoHeaders).toMatch(/base-uri\s+'none'/)
    expect(demoHeaders).toMatch(/frame-ancestors\s+'none'/)
  })

  it("demo img-src permits blob: — session-only demo uploads render from object URLs (spec 2026-07-16, media-library picker)", () => {
    expect(imgSrcOf(demoHeaders)).toBe("'self' data: blob:")
  })
})
