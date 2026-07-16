// app/lib/sample-figures.ts
// Synthetic research FIGURES (charts/tables) used ONLY for dev/demo sample content so the inline
// body-figure pipeline shows realistic graphs, not photos. They are BUNDLED LOCALLY into
// public/images/demo/figures/ (self-contained SVGs with phony data and an internal "Figure N — …"
// title + an "Illustrative sample data — not real." footer baked into each SVG). The demo blocks
// uploads, so these stand in for an author's own charts/tables in body content.
// Mirrors sample-images.ts. Do NOT use Math.random here — sampleFigureUrl(seed) is deterministic.
import type { MediaRef } from '~/types/content'

// The exact filenames in public/images/demo/figures/ (vertical/horizontal bar, line, grouped,
// donut, and table charts). Listed explicitly so the pool ships with the bundle (no runtime fs).
const FIGURE_POOL = [
  '/images/demo/figures/figure-bar-01.svg',
  '/images/demo/figures/figure-bar-02.svg',
  '/images/demo/figures/figure-bar-03.svg',
  '/images/demo/figures/figure-hbar-01.svg',
  '/images/demo/figures/figure-hbar-02.svg',
  '/images/demo/figures/figure-line-01.svg',
  '/images/demo/figures/figure-line-02.svg',
  '/images/demo/figures/figure-grouped-01.svg',
  '/images/demo/figures/figure-donut-01.svg',
  '/images/demo/figures/figure-table-01.svg',
  '/images/demo/figures/figure-table-02.svg',
] as const

/** Number of bundled synthetic figures (the whole FIGURE_POOL, for deterministic seeding). */
export function sampleFigurePoolSize(): number {
  return FIGURE_POOL.length
}

/**
 * Return a bundled synthetic-figure SVG URL from the pool.
 * Deterministic: same seed always returns the same URL. No Math.random.
 * @param seed Any integer (loop index, counter, etc.).
 */
export function sampleFigureUrl(seed: number): string {
  return FIGURE_POOL[Math.abs(Math.trunc(seed)) % FIGURE_POOL.length]!
}

/** The bare filename (e.g. `figure-bar-01.svg`) of the figure for a given seed. */
function figureFilename(seed: number): string {
  return sampleFigureUrl(seed).split('/').pop()!
}

/**
 * A DISPLAY-ONLY Media Library ref (id 0 → never written; see mediaIdForWrite) pointing at a
 * bundled synthetic figure. Used to seed the editor's "Body images" tray in demo mode so authors
 * can click-to-insert sample charts/tables (uploads are blocked in the demo). Deterministic.
 * @param seed Any integer (loop index, counter, etc.).
 */
export function sampleFigureRef(seed: number): MediaRef {
  const url = sampleFigureUrl(seed)
  const name = figureFilename(seed)
  return {
    id: 0,
    url,
    name,
    alternativeText: 'Sample research figure — illustrative chart with placeholder data',
    width: 640,
    height: 384,
    mime: 'image/svg+xml',
  }
}
