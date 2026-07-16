// Docs-currency guard: the manager-facing docs must carry the bottom nav and the CURRENT
// version. "Keep the roadmap updated" is enforced here as a failing test, not remembered as
// an intention — the same philosophy as the zero-base64 and security-header guards. If a
// release bumps package.json without refreshing the doc stamps (or vice versa), the suite
// (and CI) fails until the docs are brought current.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url))
const pkg = JSON.parse(readFileSync(root('package.json'), 'utf8')) as { version: string }

const NAV_MARKER = '<!-- studio-bottom-nav -->'
const REPO = 'https://github.com/ICJIA/copperhead-studio-20'

const NAV_DOCS = [
  'README.md',
  'ROADMAP.md',
  'docs/ICJIA-Studio-20-rewrite-copperhead.md',
  'docs/ICJIA-Studio-20-analysis-roadmap-copperhead.md',
]

describe('manager-docs bottom nav (docs-currency guard)', () => {
  for (const doc of NAV_DOCS) {
    it(`${doc} carries the bottom nav with the current version (v${pkg.version})`, () => {
      const text = readFileSync(root(doc), 'utf8')
      expect(text).toContain(NAV_MARKER)
      expect(text).toContain(`Studio build v${pkg.version}`)
      // Absolute blob/main links — they must open the LATEST rendered doc from anywhere,
      // including the .docx editions (plain external hyperlinks, never Word field codes).
      expect(text).toContain(`${REPO}/blob/main/CHANGELOG.md`)
      expect(text).toContain(`${REPO}/blob/main/ROADMAP.md`)
    })
  }

  it('ROADMAP.md is a living roadmap: Last-updated line, current version, required sections', () => {
    const text = readFileSync(root('ROADMAP.md'), 'utf8')
    expect(text).toMatch(/_Last updated: \d{4}-\d{2}-\d{2} · Current version: v\d+\.\d+\.\d+_/)
    expect(text).toContain(`Current version: v${pkg.version}`)
    expect(text).toMatch(/^## Done \(recent\)/m)
    expect(text).toMatch(/^## In progress/m)
    expect(text).toMatch(/^## Next \(proposed\)/m)
    expect(text).toMatch(/^## Blocked on R&A \(not code\)/m)
  })

  it("the rewrite spec carries a \"What's changed recently\" digest for managers", () => {
    const text = readFileSync(root('docs/ICJIA-Studio-20-rewrite-copperhead.md'), 'utf8')
    expect(text).toMatch(/^## What's changed recently/m)
  })
})
