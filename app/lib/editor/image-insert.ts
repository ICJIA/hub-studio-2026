// The ONLY new logic for the editor's image pipeline (the upstream editor has NO image handling).
// Pure + dependency-injected so it is unit-testable with no DOM and no Nuxt mount: the `upload` fn
// (the component injects useUpload().upload) and the `insert` fn (the component injects a CodeMirror
// dispatch closure) are passed in. ZERO base64: `upload` returns a Media Library MediaRef whose url is
// hosted — never a data: URI — so the inserted markdown structurally cannot carry base64.
// Alt-text (accessibility, LOCKED decision): the insert is ALWAYS ![<non-empty alt>](url "caption?"),
// the alt defaulting to the upload's alternativeText or, failing that, a filename-derived provisional;
// the returned alt offsets let the component select the alt so the author refines it in place.
import type { MediaRef } from '~/types/content'

export interface InsertedImage {
  /** The full ![alt](url "caption?") string to insert at the cursor. */
  markdown: string
  /** Offset (within `markdown`) where the alt text starts — for placing the selection in the brackets. */
  altStart: number
  /** Offset (within `markdown`) where the alt text ends. */
  altEnd: number
}

/** Turn a filename into a human-ish provisional alt: drop path + extension, separators → spaces. */
export function provisionalAltFromName(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? filename
  const dot = base.lastIndexOf('.')
  const stem = dot > 0 ? base.slice(0, dot) : base
  return stem.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'image'
}

/**
 * Build the insert string for a hosted image and the offsets bounding its alt text. Alt is the ref's
 * alternativeText (trimmed, when non-empty) else a filename-derived provisional — NEVER empty. The url
 * is the hosted MediaRef url (never base64); caption becomes the optional "…" title segment.
 */
export function buildImageMarkdown(ref: MediaRef, fallbackName?: string): InsertedImage {
  const refAlt = ref.alternativeText?.trim()
  const alt = refAlt && refAlt.length > 0 ? refAlt : provisionalAltFromName(fallbackName ?? ref.name ?? 'image')
  const caption = ref.caption?.trim()
  const tail = caption ? `](${ref.url} "${caption}")` : `](${ref.url})`
  const markdown = `![${alt}${tail}`
  const altStart = 2 // just past the leading "!["
  return { markdown, altStart, altEnd: altStart + alt.length }
}

/**
 * For each dropped/pasted File: upload it (injected), build the base64-free insert string, and insert
 * it (injected). Sequential so multiple drops keep document order. Pure orchestration over the two
 * injected effects — no DOM, no $api, fully unit-testable with fakes.
 */
export async function handleImageFiles(
  files: File[],
  upload: (file: File) => Promise<MediaRef>,
  insert: (img: InsertedImage) => void,
): Promise<void> {
  for (const file of files) {
    const ref = await upload(file)
    insert(buildImageMarkdown(ref, file.name))
  }
}
