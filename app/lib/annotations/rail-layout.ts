// app/lib/annotations/rail-layout.ts
// Word-style comment alignment for the desktop rail: each card WANTS to sit level with its
// highlight (desiredTop, measured from the painted mark), and overlapping cards are pushed
// DOWN in document order — the classic margin-comment collision pass. Pure math; the rail
// component supplies measured card heights and applies the returned absolute tops.

export interface RailLayoutEntry {
  id: string
  /** Preferred top (px) in the rail's coordinate space — the mark's offset, 0 for orphans. */
  desiredTop: number
  /** Measured card height (px). */
  height: number
}

export function layoutRailCards(
  entries: RailLayoutEntry[],
  gap: number,
): { positions: Record<string, number>; totalHeight: number } {
  const sorted = [...entries].sort((a, b) => a.desiredTop - b.desiredTop)
  const positions: Record<string, number> = {}
  let cursor = 0
  for (const e of sorted) {
    const top = Math.max(e.desiredTop, cursor)
    positions[e.id] = top
    cursor = top + e.height + gap
  }
  return { positions, totalHeight: sorted.length === 0 ? 0 : cursor - gap }
}
