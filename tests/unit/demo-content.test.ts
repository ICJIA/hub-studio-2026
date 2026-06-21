// tests/unit/demo-content.test.ts
import { describe, it, expect } from 'vitest'
import { DEMO_ARTICLES } from '~/lib/demo-content'
import { containsBase64 } from '~/lib/base64-guard'

// A figure is a body image alone in a paragraph; the URL is a bundled synthetic-figure SVG.
const FIGURE_IMG_RE = /!\[[^\]]*\]\(\/images\/demo\/figures\/figure-[\w-]+\.svg\)/g
// A captioned figure carries an emphasis-only "*Figure N. …*" paragraph (above or below the image).
const FIGURE_CAPTION_RE = /^\*Figure \d+\..*\*$/gm
// A Markdown pipe table: a header separator row of dashes (multimd-table syntax).
const TABLE_SEP_RE = /^\|[\s:|-]*-[\s:|-]*\|$/m

function figureCount(markdown: string): number {
  return (markdown.match(FIGURE_IMG_RE) ?? []).length
}
function hasTable(markdown: string): boolean {
  return TABLE_SEP_RE.test(markdown)
}

describe('DEMO_ARTICLES — content shape', () => {
  it('generates 210 articles', () => {
    expect(DEMO_ARTICLES.length).toBe(210)
  })

  it('every article title is UNIQUE (managers will flag repeats)', () => {
    const titles = DEMO_ARTICLES.map((a) => a.title)
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('every article slug is unique', () => {
    const slugs = DEMO_ARTICLES.map((a) => a.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('titles are visually distinct — not many neighbours sharing the same first two words', () => {
    const firstTwo = DEMO_ARTICLES.map((a) =>
      a.title.toLowerCase().split(/\s+/).slice(0, 2).join(' '),
    )
    // No single 2-word prefix should dominate the list (would read as near-identical titles).
    const counts = new Map<string, number>()
    for (const p of firstTwo) counts.set(p, (counts.get(p) ?? 0) + 1)
    const maxShare = Math.max(...counts.values()) / firstTwo.length
    expect(maxShare).toBeLessThan(0.2)
  })
})

describe('DEMO_ARTICLES — figure distribution', () => {
  const counts = DEMO_ARTICLES.map((a) => figureCount(a.markdown))
  const none = counts.filter((c) => c === 0).length
  const one = counts.filter((c) => c === 1).length
  const twoOrThree = counts.filter((c) => c === 2 || c === 3).length

  it('EVERY article has at least one inline figure (managers must see figures in any article)', () => {
    expect(none).toBe(0)
  })

  it('~70% of articles have exactly ONE figure (60–80%)', () => {
    const pct = one / DEMO_ARTICLES.length
    expect(pct).toBeGreaterThanOrEqual(0.6)
    expect(pct).toBeLessThanOrEqual(0.8)
  })

  it('~30% of articles have TWO or THREE figures (20–40%)', () => {
    const pct = twoOrThree / DEMO_ARTICLES.length
    expect(pct).toBeGreaterThanOrEqual(0.2)
    expect(pct).toBeLessThanOrEqual(0.4)
  })

  it('no article exceeds three figures', () => {
    expect(Math.max(...counts)).toBeLessThanOrEqual(3)
  })

  it('none/one/two-or-three partition every article (no other figure count)', () => {
    expect(none + one + twoOrThree).toBe(DEMO_ARTICLES.length)
  })
})

describe('DEMO_ARTICLES — caption positions', () => {
  // Caption BELOW: image line immediately followed by a *Figure N.* line.
  const belowRe = /!\[[^\]]*\]\(\/images\/demo\/figures\/[^)]+\)\n\n\*Figure \d+\./
  // Caption ABOVE: a *Figure N.* line immediately followed by an image line.
  const aboveRe = /\*Figure \d+\.[^\n]*\*\n\n!\[[^\]]*\]\(\/images\/demo\/figures\/[^)]+\)/

  it('most captioned figures are caption-BELOW (default)', () => {
    const below = DEMO_ARTICLES.filter((a) => belowRe.test(a.markdown)).length
    // Clear majority of articles that have a captioned figure use caption-below.
    expect(below).toBeGreaterThan(DEMO_ARTICLES.length * 0.4)
  })

  it('a clear handful of articles use caption-ABOVE', () => {
    const above = DEMO_ARTICLES.filter((a) => aboveRe.test(a.markdown)).length
    expect(above).toBeGreaterThanOrEqual(5)
  })

  it('a handful of figures have NO caption (image with no adjacent *Figure N.*)', () => {
    // An article with a figure but FEWER captions than images has an uncaptioned figure.
    const someUncaptioned = DEMO_ARTICLES.some((a) => {
      const imgs = (a.markdown.match(FIGURE_IMG_RE) ?? []).length
      const caps = (a.markdown.match(FIGURE_CAPTION_RE) ?? []).length
      return imgs > 0 && caps < imgs
    })
    expect(someUncaptioned).toBe(true)
  })

  it('caption numbers are sequential within an article (Figure 1, 2, … with no gaps)', () => {
    for (const a of DEMO_ARTICLES) {
      const nums = [...a.markdown.matchAll(/\*Figure (\d+)\./g)].map((m) => Number(m[1]))
      for (let k = 0; k < nums.length; k++) expect(nums[k]).toBe(k + 1)
    }
  })
})

describe('DEMO_ARTICLES — Markdown tables', () => {
  const withTable = DEMO_ARTICLES.filter((a) => hasTable(a.markdown)).length

  it('~20% of articles include ONE Markdown table (12–28%)', () => {
    const pct = withTable / DEMO_ARTICLES.length
    expect(pct).toBeGreaterThanOrEqual(0.12)
    expect(pct).toBeLessThanOrEqual(0.28)
  })

  it('a table article uses standard pipe-table syntax with a header + data rows', () => {
    const a = DEMO_ARTICLES.find((x) => hasTable(x.markdown))!
    const rows = a.markdown.split('\n').filter((l) => /^\|.*\|$/.test(l.trim()))
    // header row + separator row + at least 3 data rows
    expect(rows.length).toBeGreaterThanOrEqual(5)
  })
})

describe('DEMO_ARTICLES — safety / integrity', () => {
  it('no article body contains base64 data URIs', () => {
    for (const a of DEMO_ARTICLES) expect(containsBase64(a.markdown)).toBe(false)
  })

  it('all inline figures point at bundled /images/demo/figures/ SVGs (never picsum/data:)', () => {
    for (const a of DEMO_ARTICLES) {
      for (const m of a.markdown.match(/!\[[^\]]*\]\(([^)]+)\)/g) ?? []) {
        // Body images are figures: they must be bundled figure SVGs.
        expect(m).toMatch(/\/images\/demo\/figures\/figure-[\w-]+\.svg/)
      }
    }
  })

  it('splash & thumbnail remain PHOTOS (bundled /images/demo/ jpgs), not figures', () => {
    for (const a of DEMO_ARTICLES) {
      expect(a.splash!.url).toMatch(/^\/images\/demo\/[^/]+\.jpg$/)
      expect(a.thumbnail!.url).toMatch(/^\/images\/demo\/[^/]+\.jpg$/)
    }
  })
})
