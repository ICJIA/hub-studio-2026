import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '~/lib/markdown'

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
})
