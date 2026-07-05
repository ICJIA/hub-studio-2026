// tests/unit/text-excerpt.test.ts
// plainExcerpt: markdown → one clean prose excerpt for the content-list cards.
import { describe, it, expect } from 'vitest'
import { plainExcerpt } from '~/lib/text-excerpt'

describe('plainExcerpt', () => {
  it('strips markdown structure: headings, emphasis, links, code, images', () => {
    const md = '## Findings\n\nCrime **fell** by *12%* — see [the report](https://x.gov) and `table 3`. ![chart](/img.png)'
    expect(plainExcerpt(md, 200)).toBe('Findings Crime fell by 12% — see the report and table 3.')
  })

  it('collapses newlines and repeated whitespace into single spaces', () => {
    expect(plainExcerpt('a\n\nb\n   c', 100)).toBe('a b c')
  })

  it('truncates at a word boundary with an ellipsis', () => {
    const out = plainExcerpt('one two three four five six', 14)
    expect(out).toBe('one two three…')
    expect(out.length).toBeLessThanOrEqual(15)
  })

  it('returns the empty string for empty or nullish input', () => {
    expect(plainExcerpt('', 50)).toBe('')
    expect(plainExcerpt(null, 50)).toBe('')
    expect(plainExcerpt(undefined, 50)).toBe('')
  })

  it('drops leading list markers and blockquotes', () => {
    expect(plainExcerpt('- first point\n> quoted line', 100)).toBe('first point quoted line')
  })
})
