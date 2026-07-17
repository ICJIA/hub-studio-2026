// app/lib/edit-conflict.ts
// Pure save-time conflict check (design: docs/superpowers/specs/2026-07-16-edit-conflict-design.md
// §1-2). Strapi's `updatedAt` stamps are ISO 8601 (lexically sortable), so a plain string
// compare is equivalent to a Date compare and needs no parsing/timezone handling. Fails OPEN
// (no conflict) whenever either side is missing (null/undefined): a legacy or demo-seeded
// record without a stamp, or a save attempt with nothing loaded to compare against, must
// never be blocked from saving.
export function hasConflict(
  loadedAt: string | null | undefined,
  serverAt: string | null | undefined,
): boolean {
  if (!loadedAt || !serverAt) return false
  return serverAt > loadedAt
}
