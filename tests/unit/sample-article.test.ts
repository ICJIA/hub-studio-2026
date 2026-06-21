// tests/unit/sample-article.test.ts
import { describe, it, expect } from 'vitest'
import { buildSampleArticle, renderAllSampleBodies } from '~/lib/sample-article'
import { validateArticle } from '~/lib/validators/article'
import { containsBase64 } from '~/lib/base64-guard'

describe('buildSampleArticle', () => {
  it('returns a valid article (validateArticle returns [])', () => {
    const article = buildSampleArticle()
    const errors = validateArticle(article)
    expect(errors).toEqual([])
  })

  it('publishedAt is null (draft)', () => {
    const article = buildSampleArticle()
    expect(article.publishedAt).toBeNull()
  })

  it('markdown contains a heading (## or #)', () => {
    const article = buildSampleArticle()
    expect(article.markdown).toMatch(/^#{1,3} /m)
  })

  it('markdown contains a footnote marker ([^\\d])', () => {
    const article = buildSampleArticle()
    expect(article.markdown).toMatch(/\[\^[^\]]+\]/)
  })

  it('markdown contains a bulleted list item (- )', () => {
    const article = buildSampleArticle()
    expect(article.markdown).toMatch(/^- .+/m)
  })

  it('markdown contains a numbered list item (1. )', () => {
    const article = buildSampleArticle()
    expect(article.markdown).toMatch(/^\d+\. .+/m)
  })

  it('markdown contains a blockquote (> )', () => {
    const article = buildSampleArticle()
    expect(article.markdown).toMatch(/^> .+/m)
  })

  it('markdown contains bold text (**...** or __...__ )', () => {
    const article = buildSampleArticle()
    expect(article.markdown).toMatch(/\*\*[^*]+\*\*|__[^_]+__/)
  })

  it('markdown contains italic text (*...* or _..._)', () => {
    const article = buildSampleArticle()
    expect(article.markdown).toMatch(/\*[^*]+\*|_[^_]+_/)
  })

  it('markdown contains a link ([text](url))', () => {
    const article = buildSampleArticle()
    expect(article.markdown).toMatch(/\[.+\]\(https?:\/\/.+\)/)
  })

  it('markdown contains NO base64 data URIs', () => {
    const article = buildSampleArticle()
    expect(containsBase64(article.markdown)).toBe(false)
  })

  it('images array is empty (no embedded images)', () => {
    const article = buildSampleArticle()
    expect(article.images).toEqual([])
  })

  it('splash & thumbnail are display-only demo images (id 0, local bundled url, no base64); mainfile/extrafile null', () => {
    const article = buildSampleArticle()
    expect(article.splash).not.toBeNull()
    expect(article.splash!.id).toBe(0)
    expect(article.splash!.url).toMatch(/^\/images\/demo\//)
    expect(containsBase64(article.splash!.url)).toBe(false)
    expect(article.thumbnail).not.toBeNull()
    expect(article.mainfile).toBeNull()
    expect(article.extrafile).toBeNull()
  })

  it('markdown embeds inline FIGURES (bundled chart/table SVGs under /figures/, never base64)', () => {
    const article = buildSampleArticle()
    expect(article.markdown).toMatch(/!\[[^\]]*\]\(\/images\/demo\/figures\/figure-[\w-]+\.svg\)/)
    expect(containsBase64(article.markdown)).toBe(false)
  })

  it('inline figures carry sequential "Figure N." captions (Figure 1, Figure 2, …)', () => {
    const article = buildSampleArticle()
    expect(article.markdown).toContain('*Figure 1.')
    expect(article.markdown).toContain('*Figure 2.')
    // Each topic carries two captioned figures; one topic adds a third, uncaptioned figure.
    const figureImgs = article.markdown.match(/!\[[^\]]*\]\(\/images\/demo\/figures\/[^)]+\)/g) ?? []
    expect(figureImgs.length).toBeGreaterThanOrEqual(1)
    expect(figureImgs.length).toBeLessThanOrEqual(3)
  })

  it('caption numbers are sequential within an article (Figure 1, 2, … with no gaps)', () => {
    const article = buildSampleArticle()
    const nums = [...article.markdown.matchAll(/\*Figure (\d+)\./g)].map((m) => Number(m[1]))
    for (let k = 0; k < nums.length; k++) expect(nums[k]).toBe(k + 1)
  })

  it('fills every field for a one-click demo (type, doi, citation, funding, mainfiletype, categories, tags)', () => {
    const a = buildSampleArticle()
    expect(a.type).toBeTruthy()
    expect(a.doi).toBeTruthy()
    expect(a.citation).toBeTruthy()
    expect(a.funding).toBeTruthy()
    expect(a.mainfiletype).toBeTruthy()
    expect(a.categories.length).toBeGreaterThan(0)
    expect(a.tags.length).toBeGreaterThan(0)
  })

  it('has at least one author with a non-empty title', () => {
    const article = buildSampleArticle()
    expect(article.authors.length).toBeGreaterThan(0)
    expect(article.authors[0]!.title.trim()).not.toBe('')
  })

  it('abstract is a non-empty string', () => {
    const article = buildSampleArticle()
    expect(typeof article.abstract).toBe('string')
    expect((article.abstract as string).trim()).not.toBe('')
  })

  it('date is a valid ISO date string (YYYY-MM-DD)', () => {
    const article = buildSampleArticle()
    expect(article.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  // ── New assertions for the longer article ──────────────────────────────────

  it('markdown has at least 8 h2 section headings (## )', () => {
    const article = buildSampleArticle()
    const h2s = article.markdown.match(/^## .+/gm) ?? []
    expect(h2s.length).toBeGreaterThanOrEqual(8)
  })

  it('markdown has at least 6 footnote definitions ([^N]:)', () => {
    const article = buildSampleArticle()
    const defs = article.markdown.match(/^\[\^\d+\]:/gm) ?? []
    expect(defs.length).toBeGreaterThanOrEqual(6)
  })

  it('at least one author has a non-empty description (bio)', () => {
    const article = buildSampleArticle()
    const withBio = article.authors.filter((a) => a.description && a.description.trim() !== '')
    expect(withBio.length).toBeGreaterThan(0)
  })
})

// Deterministic coverage of the figure/caption/table VARIETY across the sample templates, so the
// "Add sample" demos showcase all three caption positions plus a Markdown table (mirrors the
// DEMO_ARTICLES conventions). Uses renderAllSampleBodies() — no Math.random.
describe('sample-article templates — caption-position & table variety', () => {
  const bodies = renderAllSampleBodies()
  const FIG = /!\[[^\]]*\]\(\/images\/demo\/figures\/figure-[\w-]+\.svg\)/
  const BELOW = /!\[[^\]]*\]\(\/images\/demo\/figures\/[^)]+\)\n\n\*Figure \d+\./
  const ABOVE = /\*Figure \d+\.[^\n]*\*\n\n!\[[^\]]*\]\(\/images\/demo\/figures\/[^)]+\)/
  const TABLE_SEP = /^\|[\s:|-]*-[\s:|-]*\|$/m
  const CAPTION = /^\*Figure \d+\..*\*$/gm

  it('renders one body per topic, each with an inline figure', () => {
    expect(bodies.length).toBeGreaterThanOrEqual(3)
    for (const b of bodies) expect(FIG.test(b)).toBe(true)
  })

  it('shows caption-BELOW (default) in at least one template', () => {
    expect(bodies.some((b) => BELOW.test(b))).toBe(true)
  })

  it('shows caption-ABOVE in at least one template', () => {
    expect(bodies.some((b) => ABOVE.test(b))).toBe(true)
  })

  it('shows a NO-caption figure in at least one template (more figure images than captions)', () => {
    const someUncaptioned = bodies.some((b) => {
      const imgs = (b.match(/!\[[^\]]*\]\(\/images\/demo\/figures\/[^)]+\)/g) ?? []).length
      const caps = (b.match(CAPTION) ?? []).length
      return imgs > caps
    })
    expect(someUncaptioned).toBe(true)
  })

  it('includes a Markdown pipe TABLE in at least one template', () => {
    expect(bodies.some((b) => TABLE_SEP.test(b))).toBe(true)
  })

  it('no template body contains base64 data URIs', () => {
    for (const b of bodies) expect(containsBase64(b)).toBe(false)
  })
})
