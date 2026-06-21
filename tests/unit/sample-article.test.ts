// tests/unit/sample-article.test.ts
import { describe, it, expect } from 'vitest'
import { buildSampleArticle } from '~/lib/sample-article'
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

  it('splash, thumbnail, mainfile, extrafile are all null', () => {
    const article = buildSampleArticle()
    expect(article.splash).toBeNull()
    expect(article.thumbnail).toBeNull()
    expect(article.mainfile).toBeNull()
    expect(article.extrafile).toBeNull()
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
})
