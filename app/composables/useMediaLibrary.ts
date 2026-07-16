// Thin composable binding the MediaLibrary seam to the app: picks the in-memory demo adapter
// for demo-data sessions (public demo build + local admin/admin dev session — both already run
// on in-memory content) or the Strapi adapter bound to $api, and applies the SAME upload gate
// (extension allow-list + SVG sanitize via prepareUpload) in front of BOTH, so demo uploads
// behave exactly like live ones. The Strapi adapter gets the isDemoMode() hard-throw as its
// injected write guard (belt-and-suspenders; mirrors useUpload's posture).
import type { $Fetch } from 'ofetch'
import { makeDemoMediaLibrary } from '~/lib/demo-media-library'
import { createStrapiMediaLibrary, type MediaLibrary } from '~/lib/media-library'
import { prepareUpload } from '~/composables/useUpload'
import { isDemoData, isDemoMode } from '~/lib/demo'
import type { BrowseOptions, UploadInfo } from '~/lib/upload'
import type { MediaRef } from '~/types/content'

export function useMediaLibrary() {
  const { $api } = useNuxtApp()
  const lib: MediaLibrary = isDemoData()
    ? makeDemoMediaLibrary()
    : createStrapiMediaLibrary($api as $Fetch, () => {
        if (isDemoMode()) throw new Error('Demo mode: writes are disabled')
      })

  /** Newest-first page of library images (whole-library name search when `search` is set). */
  function list(opts?: BrowseOptions): Promise<MediaRef[]> {
    return lib.list(opts)
  }

  /** Gate + sanitize, then upload through whichever adapter this session uses. */
  async function uploadImage(file: File, info?: UploadInfo): Promise<MediaRef> {
    const prepared = await prepareUpload(file)
    // Preserve the original filename for the SVG re-wrap (Blob carries no name).
    const filename = prepared instanceof File ? undefined : file.name
    return lib.upload(prepared, info, filename)
  }

  /** Update alt/caption on an existing library record. */
  function updateInfo(id: number, info: UploadInfo): Promise<MediaRef> {
    return lib.updateInfo(id, info)
  }

  return { list, uploadImage, updateInfo }
}
