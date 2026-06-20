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
import { hasAllowedImageExtension } from '~/lib/image-types'
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

export function useUpload() {
  const { $api } = useNuxtApp()

  /** Eager-upload one image: gate by extension, sanitize SVGs, then POST to the Media Library. */
  async function upload(file: File, info?: UploadInfo): Promise<MediaRef> {
    const prepared = await prepareUpload(file)
    // Preserve the original filename for the SVG re-wrap (Blob carries no name).
    const filename = prepared instanceof File ? undefined : file.name
    return uploadFile($api, prepared, info, filename)
  }

  /** Browse the Media Library (optional name search). */
  function browse(search?: string): Promise<MediaRef[]> {
    return listMediaFiles($api, { search })
  }

  /** Remove a file from the Media Library. */
  function remove(id: number): Promise<void> {
    return deleteMediaFile($api, id)
  }

  return { upload, browse, remove }
}
