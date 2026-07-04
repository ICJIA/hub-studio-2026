// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { textContentOf, captureAnchor, resolveAnchor, rangeFromOffsets, CONTEXT_LENGTH, MAX_EXACT_LENGTH } from '~/lib/annotations/anchor'

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

describe('rangeFromOffsets', () => {
  it('maps offsets spanning element boundaries back to a Range', () => {
    const text = textContentOf(container)
    const start = text.indexOf('brown')
    const r = rangeFromOffsets(container, start, start + 'brown fox.'.length)
    expect(r).not.toBeNull()
    expect(r!.toString()).toBe('brown fox.')
  })
  it('returns null for out-of-bounds or empty spans', () => {
    const len = textContentOf(container).length
    expect(rangeFromOffsets(container, len, len + 3)).toBeNull()
    expect(rangeFromOffsets(container, 5, 5)).toBeNull()
  })
})

describe('resolveAnchor', () => {
  it('resolves a unique quote', () => {
    const text = textContentOf(container)
    const start = text.indexOf('lazy')
    const res = resolveAnchor(container, { exact: 'lazy', prefix: 'over the ', suffix: ' dog', offset: start })
    expect(res).toEqual({ start, end: start + 4 })
  })
  it('disambiguates duplicate quotes by prefix/suffix', () => {
    container.innerHTML = '<p>alpha beta gamma</p><p>delta beta omega</p>'
    const text = textContentOf(container)
    const second = text.indexOf('beta', text.indexOf('beta') + 1)
    const res = resolveAnchor(container, { exact: 'beta', prefix: 'delta ', suffix: ' omega', offset: 0 })
    expect(res).toEqual({ start: second, end: second + 4 })
  })
  it('tie-breaks identical context by nearest stored offset', () => {
    container.innerHTML = '<p>x beta y</p><p>x beta y</p>'
    const text = textContentOf(container)
    const second = text.indexOf('beta', text.indexOf('beta') + 1)
    const res = resolveAnchor(container, { exact: 'beta', prefix: 'x ', suffix: ' y', offset: second })
    expect(res!.start).toBe(second)
  })
  it('survives edits elsewhere in the document (offset drift)', () => {
    container.innerHTML = '<p>NEW INTRO PARAGRAPH. The quick brown fox.</p><p>It jumps over the lazy dog.</p>'
    const text = textContentOf(container)
    const res = resolveAnchor(container, { exact: 'jumps', prefix: 'It ', suffix: ' over', offset: 23 })
    expect(res).toEqual({ start: text.indexOf('jumps'), end: text.indexOf('jumps') + 5 })
  })
  it('returns null (orphan) when the quote no longer exists', () => {
    expect(resolveAnchor(container, { exact: 'vanished text', prefix: '', suffix: '', offset: 0 })).toBeNull()
  })
  it('awards the +1 partial-overlap tier when only the prefix tail survived an edit, beating the nearest-offset tie-break', () => {
    // Two occurrences of "wombat". The stored prefix ("OLDSTUFFTAILMARK") simulates a capture
    // taken before an upstream edit. By resolve time, occurrence A's leading context is
    // unrelated ("AAAA...A"), while occurrence B's leading context became "NEWSTUFFTAILMARK":
    // the first 8 chars changed but the last 8 ("TAILMARK") still match the stored prefix's
    // tail — exercising `p.endsWith(prefix.slice(-PARTIAL_CONTEXT_CHARS))`. Neither candidate's
    // prefix matches exactly, so this is +1 (partial), not +2 (exact). suffix is '' so it
    // contributes nothing to either candidate, isolating the prefix partial tier as the sole
    // decider. offset is pinned to A (distance 0) so a passing test proves the score tier wins;
    // if the +1 tier regressed, both candidates would tie at score 0 and A would incorrectly
    // win via the nearest-offset tie-break instead.
    container.innerHTML = '<p>AAAAAAAAAAAAAAAAwombat here.</p><p>NEWSTUFFTAILMARKwombat there.</p>'
    const text = textContentOf(container)
    const indexA = text.indexOf('wombat')
    const indexB = text.indexOf('wombat', indexA + 1)
    const res = resolveAnchor(container, {
      exact: 'wombat',
      prefix: 'OLDSTUFFTAILMARK',
      suffix: '',
      offset: indexA,
    })
    expect(res!.start).toBe(indexB)
  })
})
