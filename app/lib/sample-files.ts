// app/lib/sample-files.ts
// Synthetic DOWNLOADABLE files (PDFs) used ONLY for dev/demo sample content, so the "Main Files"
// field and the preview's "Downloads" section show realistic attachments. They are BUNDLED LOCALLY
// into public/files/demo/ (tiny valid placeholder PDFs). The demo blocks uploads, so these stand in
// for an author's own report PDFs. Mirrors sample-figures.ts. Do NOT use Math.random here —
// sampleMainFileUrl(seed) is fully deterministic.
import type { MediaRef } from '~/types/content'

// The exact filenames in public/files/demo/. Listed explicitly so the pool ships with the bundle
// (no runtime fs). Each is a small valid placeholder PDF.
const FILE_POOL = [
  '/files/demo/sample-report-01.pdf',
  '/files/demo/sample-report-02.pdf',
  '/files/demo/sample-summary-01.pdf',
  '/files/demo/sample-appendix-01.pdf',
] as const

/**
 * Return a bundled placeholder PDF URL from the pool.
 * Deterministic: same seed always returns the same URL. No Math.random.
 * @param seed Any integer (loop index, counter, etc.).
 */
export function sampleMainFileUrl(seed: number): string {
  return FILE_POOL[Math.abs(Math.trunc(seed)) % FILE_POOL.length]!
}

/** The bare filename (e.g. `sample-report-01.pdf`) of the file for a given seed. */
function fileFilename(seed: number): string {
  return sampleMainFileUrl(seed).split('/').pop()!
}

/**
 * A DISPLAY-ONLY Media Library ref (id 0 → never written; see mediaIdsForWrite) pointing at a
 * bundled placeholder PDF. Used to seed the editor's "Main Files" field in demo mode (uploads are
 * blocked) and the sample-article/demo-content seeders. Deterministic.
 * @param seed Any integer (loop index, counter, etc.).
 */
export function sampleMainFileRef(seed: number): MediaRef {
  const url = sampleMainFileUrl(seed)
  const name = fileFilename(seed)
  return {
    id: 0,
    url,
    name,
    alternativeText: null,
    caption: null,
    mime: 'application/pdf',
  }
}
