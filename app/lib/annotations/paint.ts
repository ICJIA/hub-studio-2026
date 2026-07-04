// Paint resolved anchors as <mark data-ann-id> elements (spec §5). Real elements —
// focusable, clickable, screen-reader reachable — chosen over the CSS Custom
// Highlight API for accessibility. clearAnnotations() unwraps + normalize()s, so
// paint→clear→paint is idempotent and offsets stay valid (textContent never changes).
import type { AnnotationColor } from '~/types/annotations'

export function paintOffsets(
  container: Element,
  start: number,
  end: number,
  id: string,
  color: AnnotationColor,
): HTMLElement[] {
  const doc = container.ownerDocument
  if (!doc || end <= start) return []
  const marks: HTMLElement[] = []

  // Snapshot text nodes first — wrapping mutates the tree mid-walk otherwise.
  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let n: Node | null
  while ((n = walker.nextNode())) nodes.push(n as Text)

  let pos = 0
  for (const node of nodes) {
    const nodeStart = pos
    const nodeEnd = pos + node.data.length
    pos = nodeEnd
    if (nodeEnd <= start) continue
    if (nodeStart >= end) break

    const s = Math.max(start, nodeStart) - nodeStart
    const e = Math.min(end, nodeEnd) - nodeStart
    if (e <= s) continue

    let target = node
    if (s > 0) target = node.splitText(s)
    if (e - s < target.data.length) target.splitText(e - s)
    if (!target.data.trim()) continue // skip inter-block whitespace segments

    const mark = doc.createElement('mark')
    mark.className = `ann ann--${color}`
    mark.dataset.annId = id
    mark.setAttribute('tabindex', '0')
    mark.setAttribute('role', 'button')
    target.parentNode?.replaceChild(mark, target)
    mark.appendChild(target)
    marks.push(mark)
  }
  return marks
}

/** Unwrap every annotation mark under `container` and merge the split text nodes back. */
export function clearAnnotations(container: Element): void {
  for (const mark of Array.from(container.querySelectorAll('mark[data-ann-id]'))) {
    const parent = mark.parentNode
    if (!parent) continue
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
    parent.removeChild(mark)
  }
  container.normalize()
}
