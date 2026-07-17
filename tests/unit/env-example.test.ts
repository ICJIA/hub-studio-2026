// Env-sample sync guard (standing rule, 2026-07-17): every key a developer actually sets
// in .env must be documented in .env.example — KEYS ONLY, values never leave .env. Enforced
// as a failing test, same philosophy as the docs-nav and security-header guards. .env is
// gitignored, so the sync assertion runs only where a .env exists (local dev machines);
// CI still asserts .env.example itself is present and parseable.
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url))

/** Uncommented KEY names only — values are split off and never surface in any assertion. */
function keysOf(path: string): string[] {
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Za-z_][A-Za-z0-9_]*)=/)?.[1])
    .filter((k): k is string => !!k)
}

describe('.env.example (env-sample sync guard)', () => {
  it('exists and documents at least one key', () => {
    expect(existsSync(root('.env.example'))).toBe(true)
    expect(keysOf(root('.env.example')).length).toBeGreaterThan(0)
  })

  it.skipIf(!existsSync(root('.env')))(
    'documents every key set in .env (keys only — .env is local-only, so CI skips this half)',
    () => {
      const example = new Set(keysOf(root('.env.example')))
      const missing = keysOf(root('.env')).filter((k) => !example.has(k))
      expect(missing, `keys in .env missing from .env.example: ${missing.join(', ')}`).toEqual([])
    },
  )
})
