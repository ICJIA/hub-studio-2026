import { describe, it, expect } from 'vitest'
import { renderMarkdown, renderInline } from '~/lib/markdown'

describe('renderMarkdown', () => {
  it('renders a heading and a link', () => {
    const html = renderMarkdown('# Title\n\n[ICJIA](https://icjia.illinois.gov)')
    expect(html).toMatch(/<h1[^>]*>Title<\/h1>/)
    expect(html).toMatch(/<a href="https:\/\/icjia\.illinois\.gov"/)
  })

  it('renders a markdown image as an <img> from a Media Library url', () => {
    const html = renderMarkdown('![Bar chart](/uploads/figure_abc.png "Figure 1.")')
    expect(html).toMatch(/<img[^>]+src="\/uploads\/figure_abc\.png"/)
    expect(html).toMatch(/alt="Bar chart"/)
  })

  it('supports footnotes (parity plugin)', () => {
    const html = renderMarkdown('Text with a note.[^1]\n\n[^1]: The note.')
    expect(html).toMatch(/class="footnotes"/)
    expect(html).toMatch(/The note\./)
  })

  it('escapes raw HTML / <script> instead of executing it (html: false)', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\nNormal text.')
    expect(html).not.toMatch(/<script>alert\(1\)<\/script>/)
    expect(html).toMatch(/&lt;script&gt;/)
  })

  it('returns an empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('')
  })

  it('renders inline KaTeX math ($x^2$) to KaTeX HTML output', () => {
    expect(renderMarkdown('$x^2$')).toMatch(/class="katex/)
  })

  it('renders a GFM table to <table> with <td> cells', () => {
    expect(renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |')).toMatch(/<table/)
  })

  it('opens links in a new window (target=_blank, rel=noopener noreferrer)', () => {
    const html = renderMarkdown('[x](https://y)')
    expect(html).toMatch(/target="_blank"/)
    expect(html).toMatch(/rel="noopener noreferrer"/)
  })
})

describe('renderInline', () => {
  it('does NOT produce a footnote ref for [^1] notation', () => {
    const html = renderInline('text [^1]')
    expect(html).not.toMatch(/class="footnote-ref"/)
    expect(html).not.toMatch(/class="footnotes"/)
  })

  it('opens links in a new window (target=_blank, rel=noopener noreferrer)', () => {
    const html = renderInline('[x](https://y)')
    expect(html).toMatch(/target="_blank"/)
    expect(html).toMatch(/rel="noopener noreferrer"/)
  })

  it('renders bold, italic, inline code, and links', () => {
    const html = renderInline('**bold** _italic_ `code` [link](https://example.com)')
    expect(html).toMatch(/<strong>bold<\/strong>/)
    expect(html).toMatch(/<em>italic<\/em>/)
    expect(html).toMatch(/<code>code<\/code>/)
    expect(html).toMatch(/<a href="https:\/\/example\.com"/)
  })

  it('returns an empty string for empty input', () => {
    expect(renderInline('')).toBe('')
  })
})
