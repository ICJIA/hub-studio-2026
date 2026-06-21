import { describe, it, expect } from 'vitest'
import { renderMarkdown, renderInline, renderArticleBody, slugify } from '~/lib/markdown'

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

describe('renderArticleBody (AST-derived TOC + escaped h2 ids — audit M-2)', () => {
  it('assigns each h2 a slugified id and collects the TOC in document order', () => {
    const { html, toc } = renderArticleBody('## First Section\n\nbody\n\n## Second Section')
    expect(html).toMatch(/<h2 id="first-section">/)
    expect(html).toMatch(/<h2 id="second-section">/)
    expect(toc).toEqual([
      { id: 'first-section', text: 'First Section' },
      { id: 'second-section', text: 'Second Section' },
    ])
  })

  it('does NOT id non-h2 headings (h1/h3 carry no id, only h2 feeds the TOC)', () => {
    const { html, toc } = renderArticleBody('# Title\n\n## Real Section\n\n### Sub')
    expect(html).toMatch(/<h1>Title<\/h1>/)
    expect(html).toMatch(/<h3>Sub<\/h3>/)
    expect(toc).toEqual([{ id: 'real-section', text: 'Real Section' }])
  })

  it('a heading with markup/special chars yields a safe, escaped id and correct TOC text', () => {
    // Inline code + a quote + angle brackets in the heading. The id must stay within the strict
    // slug allowlist (no quote/angle-bracket can survive to break the id="..." attribute), and
    // the TOC carries the source text.
    const { html, toc } = renderArticleBody('## Using `<img>` "tags" & more')
    const idMatch = /<h2 id="([^"]*)">/.exec(html)
    expect(idMatch).not.toBeNull()
    const id = idMatch![1]!
    // Strict allowlist: only [a-z0-9_-]. No raw quote, <, >, & survived into the id.
    expect(id).toMatch(/^[a-z0-9_-]+$/)
    expect(html).not.toMatch(/<h2 id="[^"]*["<>][^"]*">/)
    // No attribute-breakout: there is no stray un-escaped quote inside the opening h2 tag.
    expect(toc).toHaveLength(1)
    expect(toc[0]!.id).toBe(id)
    expect(toc[0]!.text).toContain('img')
  })

  it('de-duplicates colliding heading ids deterministically', () => {
    const { toc } = renderArticleBody('## Notes\n\nx\n\n## Notes')
    expect(toc.map((t) => t.id)).toEqual(['notes', 'notes-2'])
  })

  it('escapes raw HTML in the body (html:false carried over) and ignores empty headings', () => {
    const { html, toc } = renderArticleBody('## \n\n<script>alert(1)</script>')
    expect(html).not.toMatch(/<script>alert\(1\)<\/script>/)
    expect(html).toMatch(/&lt;script&gt;/)
    // An empty h2 contributes nothing to the TOC.
    expect(toc).toEqual([])
  })

  it('returns no TOC for body with no h2', () => {
    expect(renderArticleBody('just a paragraph').toc).toEqual([])
  })
})

describe('slugify', () => {
  it('lowercases, replaces non-word runs with -, and trims stray dashes', () => {
    expect(slugify('  Hello, World!  ')).toBe('hello-world')
    expect(slugify('A & B')).toBe('a-b')
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
