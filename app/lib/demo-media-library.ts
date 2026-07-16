// app/lib/demo-media-library.ts
// In-memory Media Library for demo-data sessions (public demo build + local admin/admin dev
// session). Mirrors demo-repository.ts's lifetime contract: a MODULE-LEVEL store shared for the
// whole session, recreated on full reload (module re-import), never persisted, never networked.
// Seeded deterministically from the bundled demo photos + synthetic figures. Session "uploads"
// are blob: object URLs with NEGATIVE ids — mediaIdForWrite drops id <= 0, so a session image
// can structurally never reach a Strapi write (zero-base64 posture: blob:, never data:).
// No Math.random / Date.now: order is deterministic (seed order = newest-first; adds prepend).
import { sampleImageUrl, sampleImagePoolSize } from '~/lib/sample-images'
import { sampleFigureRef, sampleFigurePoolSize } from '~/lib/sample-figures'
import type { BrowseOptions, UploadInfo } from '~/lib/upload'
import type { MediaRef } from '~/types/content'

/** Default page size for library listings (matches the picker's "last 20 or so"). */
export const DEMO_MEDIA_PAGE_SIZE = 20

export interface DemoMediaLibraryDeps {
  /** Injectable for tests (unit env has no URL.createObjectURL). Defaults to the real one. */
  createObjectUrl?: (file: File | Blob) => string
}

/** "medium_police_officer_stress_splash_ab12cd.jpg" → "Police officer stress". */
function humanizeImageName(filename: string): string {
  const base = filename
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/^(?:large_|medium_|small_|thumbnail_)/, '')
    .replace(/_splash_[0-9a-f]+$/i, '')
    .replace(/_/g, ' ')
    .trim()
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : 'Research Hub image'
}

function seedEntries(): MediaRef[] {
  const photos: MediaRef[] = Array.from({ length: sampleImagePoolSize() }, (_, i) => {
    const url = sampleImageUrl(i)
    const name = url.split('/').pop()!
    return {
      id: -(i + 1),
      url,
      name,
      alternativeText: humanizeImageName(name),
      caption: null,
      width: null,
      height: null,
      mime: 'image/jpeg',
    }
  })
  const figures: MediaRef[] = Array.from({ length: sampleFigurePoolSize() }, (_, n) => ({
    ...sampleFigureRef(n),
    id: -(photos.length + n + 1),
    caption: null,
  }))
  return [...photos, ...figures]
}

// Session-scoped shared store (module-level ⇒ shared across composable calls; reset on reload).
let items: MediaRef[] | null = null
let sessionSeq = 0

function store(): MediaRef[] {
  if (!items) {
    items = seedEntries()
    sessionSeq = items.length
  }
  return items
}

/** In-memory MediaLibrary implementation (Task 3 defines the shared interface it satisfies). */
export function makeDemoMediaLibrary(deps: DemoMediaLibraryDeps = {}) {
  const createObjectUrl = deps.createObjectUrl ?? ((f: File | Blob) => URL.createObjectURL(f))
  return {
    async list(opts: BrowseOptions = {}): Promise<MediaRef[]> {
      const all = store()
      const q = opts.search?.trim().toLowerCase()
      const filtered = q ? all.filter((m) => (m.name ?? '').toLowerCase().includes(q)) : all
      const page = opts.page ?? 1
      const pageSize = opts.pageSize ?? DEMO_MEDIA_PAGE_SIZE
      return filtered.slice((page - 1) * pageSize, page * pageSize).map((m) => ({ ...m }))
    },

    async upload(file: File | Blob, info?: UploadInfo, filename?: string): Promise<MediaRef> {
      const all = store() // ensure seeded BEFORE assigning a session id
      const name = filename ?? (file instanceof File ? file.name : 'pasted-image')
      const entry: MediaRef = {
        id: -(++sessionSeq),
        url: createObjectUrl(file),
        name,
        alternativeText: info?.alternativeText ?? null,
        caption: info?.caption ?? null,
        width: null,
        height: null,
        mime: file.type || undefined,
      }
      all.unshift(entry)
      return { ...entry }
    },

    async updateInfo(id: number, info: UploadInfo): Promise<MediaRef> {
      const entry = store().find((m) => m.id === id)
      if (!entry) throw new Error('Media item not found.')
      if (info.alternativeText !== undefined) entry.alternativeText = info.alternativeText
      if (info.caption !== undefined) entry.caption = info.caption
      return { ...entry }
    },
  }
}
