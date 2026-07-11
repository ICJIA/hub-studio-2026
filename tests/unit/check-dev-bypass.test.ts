import { describe, it, expect, afterAll } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// CI bundle guard for the dev/demo login bypass (audit §"launch-time": "add a CI check that
// fails if it ships"). The guard greps built output for the sentinel token defined in
// app/lib/dev-auth.ts. Pre-launch posture (runbook §0, corrected 2026-07-05): the bypass code
// SHIPS in a production bundle but is unreachable — so CI runs the ABSENT expectation only as
// the launch gate (after dev-auth.ts is deleted), and runs the PRESENT expectation against the
// demo build today as a positive control proving the scan actually detects the token.
import { extractSentinel, scanForToken, evaluate } from '../../scripts/check-dev-bypass.mjs'

const DEV_AUTH_SNIPPET = `
/** Sentinel JWT for the synthetic dev session. */
export const DEV_ADMIN_TOKEN = 'dev-admin-session-not-a-real-jwt'
`

describe('extractSentinel (reads the token from app/lib/dev-auth.ts source)', () => {
  it('returns the DEV_ADMIN_TOKEN string literal', () => {
    expect(extractSentinel(DEV_AUTH_SNIPPET)).toBe('dev-admin-session-not-a-real-jwt')
  })

  it('throws loudly when the constant is missing (rot detection — never scan for nothing)', () => {
    expect(() => extractSentinel('export const OTHER = 1')).toThrow(/DEV_ADMIN_TOKEN/)
  })
})

describe('scanForToken (recursive scan of a built output directory)', () => {
  const root = mkdtempSync(join(tmpdir(), 'bypass-scan-'))
  afterAll(() => rmSync(root, { recursive: true, force: true }))

  it('reports every file containing the token, by relative path', () => {
    mkdirSync(join(root, '_nuxt'), { recursive: true })
    writeFileSync(join(root, '_nuxt', 'entry.js'), 'x="dev-admin-session-not-a-real-jwt"')
    writeFileSync(join(root, '_nuxt', 'clean.js'), 'nothing to see')
    writeFileSync(join(root, 'index.html'), '<html></html>')
    const hits = scanForToken(root, 'dev-admin-session-not-a-real-jwt')
    expect(hits).toEqual([join('_nuxt', 'entry.js')])
  })

  it('returns an empty list when the token appears nowhere', () => {
    expect(scanForToken(root, 'token-that-never-occurs')).toEqual([])
  })
})

describe('evaluate (expectation → pass/fail)', () => {
  it("passes 'absent' when there are no hits (the launch gate)", () => {
    expect(evaluate('absent', []).ok).toBe(true)
  })

  it("fails 'absent' when the token shipped, naming the files", () => {
    const r = evaluate('absent', ['_nuxt/entry.js'])
    expect(r.ok).toBe(false)
    expect(r.message).toContain('_nuxt/entry.js')
  })

  it("passes 'present' when the demo bundle contains the token (positive control)", () => {
    expect(evaluate('present', ['_nuxt/entry.js']).ok).toBe(true)
  })

  it("fails 'present' when the scan finds nothing (the guard itself has rotted)", () => {
    expect(evaluate('present', []).ok).toBe(false)
  })

  it('rejects unknown expectations', () => {
    expect(() => evaluate('maybe', [])).toThrow(/expect/i)
  })
})
