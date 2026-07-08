import { describe, it, expect } from 'vitest'
import { lintMarkdown } from '~/lib/editor/markdown-lint'
import { renderAllSampleBodies } from '~/lib/sample-article'

describe('lintMarkdown', () => {
  it('returns [] for a clean body (H2 start, alt text, real link text)', () => {
    const src = '## Overview\n\ntext with an ![a chart](/x.png) and a [real link](https://example.com).\n'
    expect(lintMarkdown(src)).toEqual([])
  })

  it('flags a "#" H1 in the body (reserved for the page title)', () => {
    const issues = lintMarkdown('# Title in body\n')
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ line: 1, rule: 'body-heading-level', severity: 'warn' })
  })

  it('flags a skipped heading level (## -> ####)', () => {
    const issues = lintMarkdown('## Section\n\n#### Too deep\n')
    expect(issues.map((i) => i.rule)).toContain('heading-increment')
    const jump = issues.find((i) => i.rule === 'heading-increment')!
    expect(jump.line).toBe(3)
  })

  it('flags an empty heading', () => {
    const issues = lintMarkdown('##\n')
    expect(issues.some((i) => i.rule === 'empty-heading' && i.line === 1)).toBe(true)
  })

  it('flags an image with missing alt text', () => {
    const issues = lintMarkdown('Some text ![](/chart.png) here.\n')
    const alt = issues.find((i) => i.rule === 'image-alt-missing')!
    expect(alt).toMatchObject({ line: 1, severity: 'warn' })
    expect(alt.column).toBeGreaterThan(0)
  })

  it('flags a link with empty visible text (but not an image or a footnote ref)', () => {
    const issues = lintMarkdown('A [](https://example.com) link, a ![alt](/i.png), a ref[^1].\n')
    const empties = issues.filter((i) => i.rule === 'empty-link-text')
    expect(empties).toHaveLength(1)
    expect(empties[0]!.line).toBe(1)
  })

  it('ignores headings and images inside a fenced code block', () => {
    const src = '## Real\n\n```md\n# not a heading\n![](not-flagged.png)\n```\n'
    expect(lintMarkdown(src)).toEqual([])
  })

  it('sorts issues by line then column', () => {
    const src = '#### Deep first\n\n# H1 later\n'
    const issues = lintMarkdown(src)
    expect(issues[0]!.line).toBeLessThanOrEqual(issues[issues.length - 1]!.line)
  })

  it('does not throw on the real sample bodies and returns an array', () => {
    for (const body of renderAllSampleBodies()) {
      expect(Array.isArray(lintMarkdown(body))).toBe(true)
    }
  })

  it('flags headings on CRLF (\\r\\n) input (line endings normalized)', () => {
    const issues = lintMarkdown('## Section\r\n\r\n#### Too deep\r\n')
    expect(issues.some((i) => i.rule === 'heading-increment' && i.line === 3)).toBe(true)
  })

  it('flags BOTH empty links when two are adjacent with no separator', () => {
    const issues = lintMarkdown('[](a)[](b)\n')
    expect(issues.filter((i) => i.rule === 'empty-link-text')).toHaveLength(2)
  })
})
