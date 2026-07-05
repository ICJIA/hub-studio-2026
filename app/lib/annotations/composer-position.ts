// app/lib/annotations/composer-position.ts
// Placement math for the AnnotationComposer popover (position: fixed).
//
// On the /preview page `fixed` means viewport coordinates. Inside the editor's Live-preview
// modal it does NOT: the dialog's translate makes the dialog the composer's CONTAINING BLOCK
// (fixed left/top resolve against it) and its overflow-hidden becomes the clip box — the
// viewport-only clamps the composer used before this extraction let bottom/right-edge
// selections clip against the dialog. Callers pass that dialog box (when one exists) as
// `container`: the result is clamped to viewport ∩ container and returned in the coordinate
// space the style will actually resolve in (container coords when present, else viewport).

/** Popover footprint used for clamping: w-80 (320px) + 16px gutter; ~204px tall + 16px gutter. */
const CLAMP_W = 336
const CLAMP_H = 220
const GUTTER = 16

export interface ComposerContainerRect { left: number; top: number; right: number; bottom: number }

export function composerPosition(opts: {
  /** Selection anchor in viewport coordinates (selection rect left / bottom+8). */
  desired: { x: number; y: number }
  viewport: { width: number; height: number }
  /** Containing-block rect in viewport coordinates, or null when `fixed` is truly viewport-anchored. */
  container: ComposerContainerRect | null
}): { left: number; top: number } {
  const { desired, viewport, container } = opts
  const clipRight = Math.min(viewport.width, container?.right ?? viewport.width)
  const clipBottom = Math.min(viewport.height, container?.bottom ?? viewport.height)
  const floorX = (container?.left ?? 0) + GUTTER
  const floorY = (container?.top ?? 0) + GUTTER
  const left = Math.min(desired.x, Math.max(floorX, clipRight - CLAMP_W))
  const top = Math.min(desired.y, Math.max(floorY, clipBottom - CLAMP_H))
  return { left: left - (container?.left ?? 0), top: top - (container?.top ?? 0) }
}
