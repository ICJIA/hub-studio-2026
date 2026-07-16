// app/lib/media-library.ts
// The MediaLibrary seam: one interface, two implementations. createStrapiMediaLibrary (here)
// talks to the real Media Library through the pure upload lib; makeDemoMediaLibrary
// (lib/demo-media-library.ts) is the in-memory demo twin. useMediaLibrary() picks one via
// isDemoData() — the same adapter pattern as the annotations AnnotationStore. Pure DI: the
// write guard is injected by the composable (belt-and-suspenders demo hard-block), keeping
// this module free of app/runtime imports and trivially unit-testable.
import type { $Fetch } from 'ofetch'
import { listMediaFiles, uploadFile, updateFileInfo, type BrowseOptions, type UploadInfo } from '~/lib/upload'
import type { MediaRef } from '~/types/content'

/** Default listing page size — the picker's "last 20 or so". */
export const DEFAULT_MEDIA_PAGE_SIZE = 20

export interface MediaLibrary {
  /** Newest-first page of library images (server-side name search when `search` is set). */
  list(opts?: BrowseOptions): Promise<MediaRef[]>
  /** Upload one prepared (gated/sanitized) image; returns its library ref. */
  upload(file: File | Blob, info?: UploadInfo, filename?: string): Promise<MediaRef>
  /** Update alt/caption on an existing library record; returns the updated ref. */
  updateInfo(id: number, info: UploadInfo): Promise<MediaRef>
}

/**
 * Real-Strapi adapter. `assertWritable` runs before every write (never before reads);
 * useMediaLibrary injects the isDemoMode() hard-throw there so a demo build can never
 * write even if adapter selection were somehow bypassed.
 */
export function createStrapiMediaLibrary(api: $Fetch, assertWritable: () => void = () => {}): MediaLibrary {
  return {
    list(opts: BrowseOptions = {}) {
      return listMediaFiles(api, { ...opts, pageSize: opts.pageSize ?? DEFAULT_MEDIA_PAGE_SIZE })
    },
    async upload(file, info, filename) {
      assertWritable()
      return uploadFile(api, file, info, filename)
    },
    async updateInfo(id, info) {
      assertWritable()
      return updateFileInfo(api, id, info)
    },
  }
}
