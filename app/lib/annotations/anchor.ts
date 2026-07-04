// Text-quote anchoring over a rendered container (spec §5). All character offsets are
// measured over the CONCATENATION of the container's text nodes in document order —
// identically at capture and resolve time, so there is no normalization drift.
// Dependency-free; DOM-only APIs (TreeWalker + Range) so it unit-tests in happy-dom.
import type { AnnotationAnchor } from '~/types/annotations'

export const MAX_EXACT_LENGTH = 1000
export const CONTEXT_LENGTH = 32
// How many chars of prefix-tail/suffix-head still count as partial agreement — tune alongside CONTEXT_LENGTH.
const PARTIAL_CONTEXT_CHARS = 8

export type CaptureResult =
  | { ok: true; anchor: AnnotationAnchor }
  | { ok: false; reason: 'empty' | 'outside' | 'katex' | 'too-long' }

function textNodesOf(container: Element): Text[] {
  const doc = container.ownerDocument
  if (!doc) return []
  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let n: Node | null
  while ((n = walker.nextNode())) nodes.push(n as Text)
  return nodes
}

/** The container's annotatable text: all text nodes concatenated in document order. */
export function textContentOf(container: Element): string {
  return textNodesOf(container).map((t) => t.data).join('')
}

/** Char offset of a Range boundary point within the container text. Uses Range
 *  stringification (spec-defined as the contained text), so element-boundary points
 *  (triple-click selections) resolve correctly too. */
function pointOffset(container: Element, node: Node, offset: number): number {
  const doc = container.ownerDocument!
  const probe = doc.createRange()
  probe.setStart(container, 0)
  probe.setEnd(node, offset)
  return probe.toString().length
}

/** Character span [start, end) that `el`'s text occupies within the container text. */
function elementSpan(container: Element, el: Element): { start: number; end: number } {
  return {
    start: pointOffset(container, el, 0),
    end: pointOffset(container, el, el.childNodes.length),
  }
}

export function captureAnchor(container: Element, range: Range): CaptureResult {
  if (range.collapsed) return { ok: false, reason: 'empty' }
  if (!container.contains(range.commonAncestorContainer)) return { ok: false, reason: 'outside' }

  const text = textContentOf(container)
  const start = pointOffset(container, range.startContainer, range.startOffset)
  const end = pointOffset(container, range.endContainer, range.endOffset)
  const exact = text.slice(start, end)
  if (!exact.trim()) return { ok: false, reason: 'empty' }
  if (exact.length > MAX_EXACT_LENGTH) return { ok: false, reason: 'too-long' }

  // Reject selections overlapping rendered KaTeX widgets: marks inside .katex break layout.
  for (const el of Array.from(container.querySelectorAll('.katex'))) {
    const span = elementSpan(container, el)
    if (start < span.end && end > span.start) return { ok: false, reason: 'katex' }
  }

  return {
    ok: true,
    anchor: {
      exact,
      prefix: text.slice(Math.max(0, start - CONTEXT_LENGTH), start),
      suffix: text.slice(end, end + CONTEXT_LENGTH),
      offset: start,
    },
  }
}

/** Map a character span over the container text back to a DOM Range.
 *  At a node junction: a START boundary lands at the start of the later node; an END
 *  boundary stays at the end of the earlier node (tightest possible range). */
export function rangeFromOffsets(container: Element, start: number, end: number): Range | null {
  if (end <= start || start < 0) return null
  const doc = container.ownerDocument
  if (!doc) return null
  const range = doc.createRange()
  let pos = 0
  let startSet = false
  for (const node of textNodesOf(container)) {
    const next = pos + node.data.length
    if (!startSet && start < next) {
      range.setStart(node, start - pos)
      startSet = true
    }
    if (startSet && end <= next) {
      range.setEnd(node, end - pos)
      return range
    }
    pos = next
  }
  return null
}

/** Re-locate a captured anchor in (possibly edited) container text.
 *  Score every occurrence of `exact` by prefix/suffix agreement, tie-break by
 *  distance from the stored offset. Returns character offsets, or null → orphan. */
export function resolveAnchor(
  container: Element,
  anchor: AnnotationAnchor,
): { start: number; end: number } | null {
  const { exact, prefix, suffix, offset } = anchor
  if (!exact) return null
  const text = textContentOf(container)

  const candidates: number[] = []
  let i = text.indexOf(exact)
  while (i !== -1) {
    candidates.push(i)
    i = text.indexOf(exact, i + 1)
  }
  if (candidates.length === 0) return null

  const scored = candidates.map((start) => {
    const p = text.slice(Math.max(0, start - prefix.length), start)
    const s = text.slice(start + exact.length, start + exact.length + suffix.length)
    let score = 0
    if (prefix) {
      if (p === prefix) score += 2
      else if (p && (prefix.endsWith(p) || p.endsWith(prefix.slice(-PARTIAL_CONTEXT_CHARS)))) score += 1
    }
    if (suffix) {
      if (s === suffix) score += 2
      else if (s && (suffix.startsWith(s) || s.startsWith(suffix.slice(0, PARTIAL_CONTEXT_CHARS)))) score += 1
    }
    return { start, score, dist: Math.abs(start - offset) }
  })
  scored.sort((a, b) => b.score - a.score || a.dist - b.dist)
  const winner = scored[0]!
  return { start: winner.start, end: winner.start + exact.length }
}
