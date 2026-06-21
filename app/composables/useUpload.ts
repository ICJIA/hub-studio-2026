// Thin composable that binds the configured $api to the pure upload libs (mirrors
// composables/useAuth.ts). The only new logic is prepareUpload: enforce the allowed-image
// extension gate, then sanitize SVGs BEFORE upload — extracted as a pure function so it is
// unit-testable without a Nuxt mount. Eager-upload always yields a Media Library URL; this
// layer NEVER produces a data: URI.
import {
  uploadFile, listMediaFiles, deleteMediaFile,
  type UploadInfo, type BrowseOptions,
} from '~/lib/upload'
import { isSvg, sanitizeSvgText } from '~/lib/sanitize-svg'
import { hasAllowedImageExtension, hasAllowedDocumentExtension } from '~/lib/image-types'
import { isDemoMode } from '~/lib/demo'
import type { MediaRef } from '~/types/content'

/**
 * Gate + sanitize a file for upload. Throws on a disallowed extension; for an SVG, returns a
 * sanitized image/svg+xml Blob; otherwise returns the original File unchanged. Pure — no $api.
 */
export async function prepareUpload(file: File): Promise<File | Blob> {
  if (!hasAllowedImageExtension(file.name)) {
    throw new Error('Unsupported image type. Allowed formats: jpg, jpeg, png, svg.')
  }
  if (isSvg(file)) {
    const cleaned = sanitizeSvgText(await file.text())
    return new Blob([cleaned], { type: 'image/svg+xml' })
  }
  return file
}

/**
 * Gate a document file for upload. Throws on a disallowed extension; no image processing
 * is applied (documents are not SVG-sanitized). Pure — no $api.
 */
export function prepareDocumentUpload(file: File): File {
  if (!hasAllowedDocumentExtension(file.name)) {
    throw new Error('Unsupported document type. Allowed formats: pdf, doc, docx, xlsx, csv.')
  }
  return file
}

export function useUpload() {
  const { $api } = useNuxtApp()

  /** Eager-upload one image: gate by extension, sanitize SVGs, then POST to the Media Library. */
  async function upload(file: File, info?: UploadInfo): Promise<MediaRef> {
    // HARD write-block (belt-and-suspenders): the public demo never uploads to Strapi.
    if (isDemoMode()) throw new Error('Demo mode: writes are disabled')
    const prepared = await prepareUpload(file)
    // Preserve the original filename for the SVG re-wrap (Blob carries no name).
    const filename = prepared instanceof File ? undefined : file.name
    return uploadFile($api, prepared, info, filename)
  }

  /**
   * Eager-upload one document (PDF/office): gate by extension, then POST to the Media Library.
   * No alt/caption info is passed — documents have no image metadata.
   */
  async function uploadDocument(file: File): Promise<MediaRef> {
    // HARD write-block (belt-and-suspenders): the public demo never uploads to Strapi.
    if (isDemoMode()) throw new Error('Demo mode: writes are disabled')
    const prepared = prepareDocumentUpload(file)
    return uploadFile($api, prepared)
  }

  /** Browse the Media Library (optional name search). */
  function browse(search?: string): Promise<MediaRef[]> {
    return listMediaFiles($api, { search })
  }

  /** Remove a file from the Media Library. */
  function remove(id: number): Promise<void> {
    // HARD write-block (belt-and-suspenders): the public demo never deletes from Strapi.
    if (isDemoMode()) throw new Error('Demo mode: writes are disabled')
    return deleteMediaFile($api, id)
  }

  return { upload, uploadDocument, browse, remove }
}
