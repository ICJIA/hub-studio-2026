import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '~/lib/markdown'

describe('markdown-it-attrs (class/id allowlist — security-audit.md §2.3)', () => {
  it('applies class attribute from {.foo} syntax on a link', () => {
    const html = renderMarkdown('[x](https://e.com){.foo}')
    expect(html).toMatch(/class="foo"/)
  })

  it('applies class attribute from {.btn} syntax on an image', () => {
    const html = renderMarkdown('![alt](/img.png){.wide}')
    expect(html).toMatch(/class="wide"/)
  })

  it('applies id attribute from {#section} syntax on a heading', () => {
    const html = renderMarkdown('## Section {#my-id}')
    expect(html).toMatch(/id="my-id"/)
  })

  it('DROPS onclick= — allowlist permits only id and class (no on* handlers)', () => {
    const html = renderMarkdown('[x](https://e.com){onclick=alert(1)}')
    expect(html).not.toMatch(/onclick=/)
  })

  it('DROPS style= — allowlist permits only id and class (no style)', () => {
    const html = renderMarkdown('[x](https://e.com){style=color:red}')
    expect(html).not.toMatch(/style=/)
  })
})
