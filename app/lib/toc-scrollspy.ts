/**
 * Pure, unit-tested scroll-spy logic for the PublishedArticlePreview TOC.
 *
 * pickActiveHeadingId:
 *   Returns the id of the LAST heading with top <= offset + 4 (i.e., at or
 *   above the "active line"). If no heading has crossed the line yet, returns
 *   the first heading's id so something is always highlighted from the start.
 *   Returns null only for an empty list.
 *
 * @param headings  Array of { id, top } where `top` is each heading's top
 *                  relative to the scroll container's viewport top (can be negative
 *                  when the heading has scrolled above the fold).
 * @param offset    The "active line" in px from the container top (e.g. 96 on
 *                  the preview page, 32 in the modal).
 */
export function pickActiveHeadingId(
  headings: { id: string; top: number }[],
  offset: number,
): string | null {
  if (headings.length === 0) return null

  // Walk backwards: first heading whose top <= offset + 4 wins.
  const threshold = offset + 4
  for (let i = headings.length - 1; i >= 0; i--) {
    if (headings[i]!.top <= threshold) {
      return headings[i]!.id
    }
  }

  // No heading has reached the line yet — highlight the first section.
  return headings[0]!.id
}
