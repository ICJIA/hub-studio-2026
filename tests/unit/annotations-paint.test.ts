// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { paintOffsets, clearAnnotations } from '~/lib/annotations/paint'
import { textContentOf } from '~/lib/annotations/anchor'

let container: HTMLElement
beforeEach(() => {
  container = document.createElement('div')
  container.innerHTML = '<p>The quick <strong>brown</strong> fox.</p><p>It jumps.</p>'
  document.body.appendChild(container)
})

describe('paintOffsets', () => {
  it('wraps a same-node span in a single mark with id, color, and a11y attrs', () => {
    const text = textContentOf(container)
    const start = text.indexOf('quick')
    const marks = paintOffsets(container, start, start + 5, 'a1', 'yellow')
    expect(marks).toHaveLength(1)
    const m = marks[0]!
    expect(m.tagName).toBe('MARK')
    expect(m.textContent).toBe('quick')
    expect(m.dataset.annId).toBe('a1')
    expect(m.className).toBe('ann ann--yellow')
    expect(m.getAttribute('tabindex')).toBe('0')
    expect(m.getAttribute('role')).toBe('button')
  })
  it('spans element boundaries with one mark per text-node segment', () => {
    const text = textContentOf(container)
    const start = text.indexOf('quick')
    const end = text.indexOf('fox') + 3
    const marks = paintOffsets(container, start, end, 'a2', 'pink')
    expect(marks.length).toBeGreaterThanOrEqual(3) // 'quick ', 'brown', ' fox'
    expect(marks.map((m) => m.textContent).join('')).toBe('quick brown fox')
    expect(container.textContent).toBe('The quick brown fox.It jumps.') // text unchanged
  })
  it('does not paint whitespace-only segments', () => {
    container.innerHTML = '<p>end.</p>\n<p>start</p>'
    const text = textContentOf(container)
    const start = text.indexOf('end')
    const end = text.indexOf('start') + 5
    const marks = paintOffsets(container, start, end, 'a3', 'blue')
    expect(marks.every((m) => (m.textContent ?? '').trim().length > 0)).toBe(true)
  })
})

describe('clearAnnotations', () => {
  it('round-trips: paint → clear restores identical HTML', () => {
    const before = container.innerHTML
    const text = textContentOf(container)
    paintOffsets(container, text.indexOf('quick'), text.indexOf('quick') + 5, 'a1', 'yellow')
    paintOffsets(container, text.indexOf('jumps'), text.indexOf('jumps') + 5, 'a2', 'green')
    expect(container.querySelectorAll('mark[data-ann-id]').length).toBeGreaterThan(0)
    clearAnnotations(container)
    expect(container.querySelectorAll('mark').length).toBe(0)
    expect(container.innerHTML).toBe(before)
  })
  it('is idempotent and repaint-safe (paint → clear → paint at same offsets)', () => {
    const text = textContentOf(container)
    const start = text.indexOf('brown')
    paintOffsets(container, start, start + 5, 'a1', 'yellow')
    clearAnnotations(container)
    const marks = paintOffsets(container, start, start + 5, 'a1', 'blue')
    expect(marks).toHaveLength(1)
    expect(marks[0]!.textContent).toBe('brown')
  })
})
