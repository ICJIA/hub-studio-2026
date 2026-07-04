// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { textContentOf, captureAnchor, CONTEXT_LENGTH, MAX_EXACT_LENGTH } from '~/lib/annotations/anchor'

let container: HTMLElement

/** Build a range from character offsets over the container's concatenated text (test helper). */
function rangeAt(start: number, end: number): Range {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  let pos = 0
  let node: Node | null
  let startSet = false
  while ((node = walker.nextNode())) {
    const t = node as Text
    const next = pos + t.data.length
    if (!startSet && start < next) { range.setStart(t, start - pos); startSet = true }
    if (startSet && end <= next) { range.setEnd(t, end - pos); return range }
    pos = next
  }
  throw new Error('offsets out of bounds')
}

beforeEach(() => {
  container = document.createElement('div')
  container.innerHTML = '<p>The quick <strong>brown</strong> fox.</p><p>It jumps over the lazy dog.</p>'
  document.body.appendChild(container)
})

describe('textContentOf', () => {
  it('concatenates all text nodes in document order', () => {
    expect(textContentOf(container)).toBe('The quick brown fox.It jumps over the lazy dog.')
  })
})

describe('captureAnchor', () => {
  it('captures exact/prefix/suffix/offset for a same-node selection', () => {
    const text = textContentOf(container)
    const start = text.indexOf('jumps')
    const res = captureAnchor(container, rangeAt(start, start + 'jumps'.length))
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.anchor.exact).toBe('jumps')
      expect(res.anchor.offset).toBe(start)
      expect(res.anchor.prefix.endsWith('It ')).toBe(true)
      expect(res.anchor.suffix.startsWith(' over')).toBe(true)
      expect(res.anchor.prefix.length).toBeLessThanOrEqual(CONTEXT_LENGTH)
      expect(res.anchor.suffix.length).toBeLessThanOrEqual(CONTEXT_LENGTH)
    }
  })
  it('captures across element boundaries (strong + block gap)', () => {
    const text = textContentOf(container)
    const start = text.indexOf('brown')
    const end = text.indexOf('jumps') + 'jumps'.length
    const res = captureAnchor(container, rangeAt(start, end))
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.anchor.exact).toBe('brown fox.It jumps')
  })
  it('rejects a collapsed selection', () => {
    const r = rangeAt(3, 4); r.collapse(true)
    expect(captureAnchor(container, r)).toEqual({ ok: false, reason: 'empty' })
  })
  it('rejects a whitespace-only selection', () => {
    const text = textContentOf(container)
    const sp = text.indexOf(' fox')
    expect(captureAnchor(container, rangeAt(sp, sp + 1))).toEqual({ ok: false, reason: 'empty' })
  })
  it('rejects a selection outside the container', () => {
    const outside = document.createElement('p')
    outside.textContent = 'elsewhere'
    document.body.appendChild(outside)
    const r = document.createRange()
    r.setStart(outside.firstChild!, 0); r.setEnd(outside.firstChild!, 4)
    expect(captureAnchor(container, r)).toEqual({ ok: false, reason: 'outside' })
  })
  it('rejects a selection intersecting KaTeX output', () => {
    container.innerHTML = '<p>Before <span class="katex">x^2</span> after.</p>'
    const text = textContentOf(container)
    const start = text.indexOf('x^2')
    expect(captureAnchor(container, rangeAt(start, start + 3))).toEqual({ ok: false, reason: 'katex' })
  })
  it('rejects selections longer than MAX_EXACT_LENGTH', () => {
    container.innerHTML = `<p>${'a'.repeat(MAX_EXACT_LENGTH + 10)}</p>`
    expect(captureAnchor(container, rangeAt(0, MAX_EXACT_LENGTH + 5))).toEqual({ ok: false, reason: 'too-long' })
  })
})
