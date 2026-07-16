# Media-Library Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Library-first image picking — every image surface shows the ~20 newest Strapi Media Library images (searchable) with upload-from-desktop as the second path, working identically in demo mode where nothing persists.

**Architecture:** A `MediaLibrary` adapter seam (Strapi + in-memory demo implementations, selected by `isDemoData()`) mirroring the existing `AnnotationStore` pattern. A shared `MediaLibraryGrid.vue` consumed by `MediaPicker.vue` (new [Library | Upload] tabs), `MediaField.vue` (alt-persistence fix), and `BodyImagesField.vue` (Add from library). Demo uploads are session-only `blob:` object URLs with negative ids that `mediaIdForWrite` structurally drops.

**Tech Stack:** Nuxt 4 SPA, Vue 3 `<script setup>`, Nuxt UI 4 (`UButton`/`UInput`/`UFormField`), Vitest 4 (`tests/unit` node env, `tests/nuxt` via `mountSuspended`/`mockNuxtImport`), Strapi 5 upload plugin REST.

**Spec:** `docs/superpowers/specs/2026-07-16-media-library-picker-design.md` (approved 2026-07-16).

## Global Constraints

- **Zero-base64 invariant:** no `data:` URI may ever be produced for storage; session images use `blob:` object URLs and negative ids only.
- **No new npm dependencies** (pinned-deps posture). No `Math.random`, no `Date.now()` in demo data (deterministic seed order stands in for "newest first").
- **TDD:** every task writes its failing test first, verifies the failure, implements, verifies green.
- **Node 22** (`.nvmrc`); run tests with `npx vitest run <file>` (targeted) and `npm test` (full suite: currently 677 tests / 97 files, all green — keep it that way).
- **Commit style:** conventional prefix + em-dash summary, matching `git log`. **Never add `Co-Authored-By` or any AI trailer** (user's standing rule).
- Components auto-import by filename (no path prefix); composables auto-import from `app/composables/`.
- Copy rules: user-facing copy is plain English, sentence case, no jargon (match existing strings).

---

### Task 1: `updateFileInfo` in the upload lib

**Files:**
- Modify: `app/lib/upload.ts`
- Test: `tests/unit/upload.test.ts`

**Interfaces:**
- Consumes: existing `UploadInfo`, `mediaFromStrapi`, `StrapiMedia` (already imported in `upload.ts`).
- Produces: `updateFileInfo(api: $Fetch, id: number, info: UploadInfo): Promise<MediaRef>` — used by Task 3's Strapi adapter.

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/upload.test.ts` (after the `deleteMediaFile` describe; `rawFile` already exists at the top of the file):

```ts
describe('updateFileInfo', () => {
  it('POSTs /upload?id=<id> with a fileInfo FormData part and maps the returned file', async () => {
    const api = vi.fn().mockResolvedValue(rawFile) as unknown as $Fetch
    const ref = await updateFileInfo(api, 42, { alternativeText: 'Bar chart of outcomes', caption: 'Figure 1.' })

    const [url, opts] = (api as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('/upload?id=42')
    expect(opts.method).toBe('POST')
    const body = opts.body as FormData
    expect(body).toBeInstanceOf(FormData)
    expect(body.has('files')).toBe(false) // metadata-only update — no file part
    expect(JSON.parse(body.get('fileInfo') as string)).toEqual({
      alternativeText: 'Bar chart of outcomes', caption: 'Figure 1.',
    })
    expect(ref.id).toBe(42)
    expect(ref.alternativeText).toBe('Bar chart of outcomes')
    expect(ref.url.startsWith('data:')).toBe(false)
  })

  it('accepts an array-shaped response (defensive) and still maps the first file', async () => {
    const api = vi.fn().mockResolvedValue([rawFile]) as unknown as $Fetch
    const ref = await updateFileInfo(api, 42, { alternativeText: 'X' })
    expect(ref.id).toBe(42)
  })

  it('throws when the response carries no file', async () => {
    const api = vi.fn().mockResolvedValue(null) as unknown as $Fetch
    await expect(updateFileInfo(api, 42, { alternativeText: 'X' })).rejects.toThrow(/no file/i)
  })
})
```

Also extend the import at the top of the test file:

```ts
import { uploadFile, listMediaFiles, deleteMediaFile, updateFileInfo } from '~/lib/upload'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/upload.test.ts`
Expected: FAIL — `updateFileInfo` is not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `app/lib/upload.ts` (before `deleteMediaFile`):

```ts
/**
 * Update alt/caption (fileInfo) on an EXISTING Media Library file. Strapi 5 upload plugin:
 * POST /upload?id=<id> with a multipart `fileInfo` part and no `files` part updates metadata
 * in place. Response is the updated file object (handled defensively as object-or-array).
 * NOTE: request shape follows the Strapi 5 upload REST contract; verify against the live
 * sandbox at first staging use (runbook §Strapi checklist carries the permission + check).
 */
export async function updateFileInfo(api: $Fetch, id: number, info: UploadInfo): Promise<MediaRef> {
  const form = new FormData()
  form.append('fileInfo', JSON.stringify(info))
  const res = await api<StrapiMedia | StrapiMedia[]>(`/upload?id=${id}`, { method: 'POST', body: form })
  const ref = mediaFromStrapi(Array.isArray(res) ? res[0] : res)
  if (!ref) throw new Error('Update succeeded but returned no file.')
  return ref
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/upload.test.ts`
Expected: PASS (all, including the three new tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/upload.ts tests/unit/upload.test.ts
git commit -m "feat(media): updateFileInfo — metadata-only Strapi upload update (pure DI)"
```

---

### Task 2: In-memory demo media library

**Files:**
- Modify: `app/lib/sample-images.ts` (add pool-size accessor)
- Modify: `app/lib/sample-figures.ts` (add pool-size accessor)
- Create: `app/lib/demo-media-library.ts`
- Test: `tests/unit/demo-media-library.test.ts`

**Interfaces:**
- Consumes: `sampleImageUrl(seed)`, `sampleFigureRef(seed)`, `MediaRef`, `UploadInfo`, `BrowseOptions`.
- Produces (used by Task 4 and Task 9's invariant test):
  - `sampleImagePoolSize(): number` (from `sample-images.ts`)
  - `sampleFigurePoolSize(): number` (from `sample-figures.ts`)
  - `makeDemoMediaLibrary(deps?: { createObjectUrl?: (f: File | Blob) => string }): MediaLibrary`
    where the returned object has `list(opts?: BrowseOptions)`, `upload(file, info?, filename?)`,
    `updateInfo(id, info)` — all `Promise`-returning, exactly the Task 3 `MediaLibrary` shape.
  - Module-level store: fresh per module evaluation (tests use `vi.resetModules()` + dynamic import).

- [ ] **Step 1: Add the two pool-size accessors (no test needed beyond compile — they're used by Step 2's tests)**

In `app/lib/sample-images.ts`, after the `POOL` const:

```ts
/** Number of bundled demo photos (the whole POOL, for exhaustive deterministic seeding). */
export function sampleImagePoolSize(): number {
  return POOL.length
}
```

In `app/lib/sample-figures.ts`, after the `FIGURE_POOL` const:

```ts
/** Number of bundled synthetic figures (the whole FIGURE_POOL, for deterministic seeding). */
export function sampleFigurePoolSize(): number {
  return FIGURE_POOL.length
}
```

- [ ] **Step 2: Write the failing tests**

Create `tests/unit/demo-media-library.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sampleImagePoolSize } from '~/lib/sample-images'
import { sampleFigurePoolSize } from '~/lib/sample-figures'
import { mediaIdForWrite, mediaIdsForWrite } from '~/lib/strapi-rest'

const SEED_COUNT = sampleImagePoolSize() + sampleFigurePoolSize()

// The store is module-level (reset on re-import, mirroring demo-repository's contract),
// so every test gets a fresh module instance.
beforeEach(() => {
  vi.resetModules()
})

async function freshLib(deps?: { createObjectUrl?: (f: File | Blob) => string }) {
  const mod = await import('~/lib/demo-media-library')
  return mod.makeDemoMediaLibrary(deps)
}

describe('makeDemoMediaLibrary — seed', () => {
  it('seeds every bundled photo and figure, newest-first, with unique negative ids', async () => {
    const lib = await freshLib()
    const all = await lib.list({ pageSize: 100 })
    expect(all).toHaveLength(SEED_COUNT)
    const ids = all.map((m) => m.id)
    expect(new Set(ids).size).toBe(SEED_COUNT)
    expect(ids.every((id) => id < 0)).toBe(true)
    // Deterministic: a second fresh module seeds the identical list.
    vi.resetModules()
    const again = await (await freshLib()).list({ pageSize: 100 })
    expect(again).toEqual(all)
  })

  it('seeded photos carry humanized alt text derived from the filename', async () => {
    const lib = await freshLib()
    const all = await lib.list({ pageSize: 100 })
    const photo = all.find((m) => m.mime === 'image/jpeg')!
    expect(photo.alternativeText).toBeTruthy()
    expect(photo.alternativeText).not.toMatch(/_/) // underscores humanized away
    expect(photo.alternativeText).not.toMatch(/^medium|^small|^large/i) // size prefix stripped
  })

  it('pages by 20 by default and reports the tail page short', async () => {
    const lib = await freshLib()
    const page1 = await lib.list({})
    expect(page1).toHaveLength(20)
    const page2 = await lib.list({ page: 2 })
    expect(page2).toHaveLength(SEED_COUNT - 20)
  })

  it('search filters by name, case-insensitively', async () => {
    const lib = await freshLib()
    const all = await lib.list({ pageSize: 100 })
    const needle = (all[0]!.name ?? '').slice(0, 8)
    const hits = await lib.list({ search: needle.toUpperCase(), pageSize: 100 })
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every((m) => (m.name ?? '').toLowerCase().includes(needle.toLowerCase()))).toBe(true)
  })
})

describe('makeDemoMediaLibrary — session uploads', () => {
  it('prepends a session entry with a negative id and the injected object URL', async () => {
    const createObjectUrl = vi.fn(() => 'blob:demo/abc')
    const lib = await freshLib({ createObjectUrl })
    const file = new File(['x'], 'new-chart.png', { type: 'image/png' })
    const ref = await lib.upload(file, { alternativeText: 'A new chart' })
    expect(createObjectUrl).toHaveBeenCalledWith(file)
    expect(ref.id).toBeLessThan(0)
    expect(ref.url).toBe('blob:demo/abc')
    expect(ref.alternativeText).toBe('A new chart')
    const first = (await lib.list({}))[0]!
    expect(first.id).toBe(ref.id) // newest first
  })

  it('session ids never collide with seed ids', async () => {
    const lib = await freshLib({ createObjectUrl: () => 'blob:demo/x' })
    const ref = await lib.upload(new File(['x'], 'a.png', { type: 'image/png' }))
    const all = await lib.list({ pageSize: 200 })
    expect(new Set(all.map((m) => m.id)).size).toBe(all.length)
    expect(ref.id).toBe(-(SEED_COUNT + 1))
  })

  it('session uploads can never reach a Strapi write: mediaIdForWrite drops them', async () => {
    const lib = await freshLib({ createObjectUrl: () => 'blob:demo/y' })
    const ref = await lib.upload(new File(['x'], 'b.png', { type: 'image/png' }), { alternativeText: 'B' })
    expect(ref.url.startsWith('blob:')).toBe(true)
    expect(ref.url.startsWith('data:')).toBe(false)
    expect(mediaIdForWrite(ref)).toBeNull()
    expect(mediaIdsForWrite([ref])).toEqual([])
  })
})

describe('makeDemoMediaLibrary — updateInfo', () => {
  it('mutates alt/caption in-memory and returns the updated ref', async () => {
    const lib = await freshLib()
    const target = (await lib.list({}))[0]!
    const updated = await lib.updateInfo(target.id, { alternativeText: 'New alt', caption: 'New caption' })
    expect(updated.alternativeText).toBe('New alt')
    expect(updated.caption).toBe('New caption')
    const relisted = (await lib.list({}))[0]!
    expect(relisted.alternativeText).toBe('New alt')
  })

  it('throws for an unknown id', async () => {
    const lib = await freshLib()
    await expect(lib.updateInfo(999999, { alternativeText: 'X' })).rejects.toThrow(/not found/i)
  })

  it('list returns copies — mutating a returned ref does not corrupt the store', async () => {
    const lib = await freshLib()
    const item = (await lib.list({}))[0]!
    item.alternativeText = 'MUTATED'
    const relisted = (await lib.list({}))[0]!
    expect(relisted.alternativeText).not.toBe('MUTATED')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/unit/demo-media-library.test.ts`
Expected: FAIL — module `~/lib/demo-media-library` does not exist. (Task 3's `MediaLibrary` type doesn't exist yet either — this file deliberately types its return structurally, see Step 4.)

- [ ] **Step 4: Write the implementation**

Create `app/lib/demo-media-library.ts`:

```ts
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/unit/demo-media-library.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 6: Commit**

```bash
git add app/lib/sample-images.ts app/lib/sample-figures.ts app/lib/demo-media-library.ts tests/unit/demo-media-library.test.ts
git commit -m "feat(demo): in-memory demo media library — seeded from bundled assets, session-only blob: uploads, negative-id never-written convention"
```

---

### Task 3: `MediaLibrary` interface + Strapi adapter

**Files:**
- Create: `app/lib/media-library.ts`
- Test: `tests/unit/media-library.test.ts`

**Interfaces:**
- Consumes: `listMediaFiles`, `uploadFile`, `updateFileInfo` (Task 1), `BrowseOptions`, `UploadInfo`.
- Produces (used by Tasks 4–8):
  - `DEFAULT_MEDIA_PAGE_SIZE = 20`
  - `interface MediaLibrary { list(opts?: BrowseOptions): Promise<MediaRef[]>; upload(file: File | Blob, info?: UploadInfo, filename?: string): Promise<MediaRef>; updateInfo(id: number, info: UploadInfo): Promise<MediaRef> }`
  - `createStrapiMediaLibrary(api: $Fetch, assertWritable?: () => void): MediaLibrary`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/media-library.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { createStrapiMediaLibrary, DEFAULT_MEDIA_PAGE_SIZE } from '~/lib/media-library'
import type { $Fetch } from 'ofetch'

const rawFile = {
  id: 7, name: 'photo.jpg', url: '/uploads/photo_1a2b3c.jpg', mime: 'image/jpeg',
  alternativeText: 'A photo', caption: null, width: 640, height: 480,
}

describe('createStrapiMediaLibrary', () => {
  it('list delegates to /upload/files with the default page size of 20', async () => {
    const api = vi.fn().mockResolvedValue([rawFile]) as unknown as $Fetch
    const lib = createStrapiMediaLibrary(api)
    const refs = await lib.list({ search: 'photo' })
    const [url, opts] = (api as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('/upload/files')
    expect(opts.query['pagination[pageSize]']).toBe(DEFAULT_MEDIA_PAGE_SIZE)
    expect(opts.query['filters[name][$containsi]']).toBe('photo')
    expect(refs[0]!.id).toBe(7)
  })

  it('an explicit pageSize wins over the default', async () => {
    const api = vi.fn().mockResolvedValue([]) as unknown as $Fetch
    await createStrapiMediaLibrary(api).list({ pageSize: 5 })
    const opts = (api as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(opts.query['pagination[pageSize]']).toBe(5)
  })

  it('upload delegates to POST /upload', async () => {
    const api = vi.fn().mockResolvedValue([rawFile]) as unknown as $Fetch
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    const ref = await createStrapiMediaLibrary(api).upload(file, { alternativeText: 'A photo' })
    const [url, opts] = (api as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('/upload')
    expect(opts.method).toBe('POST')
    expect(ref.id).toBe(7)
  })

  it('updateInfo delegates to POST /upload?id=<id>', async () => {
    const api = vi.fn().mockResolvedValue(rawFile) as unknown as $Fetch
    const ref = await createStrapiMediaLibrary(api).updateInfo(7, { alternativeText: 'Better alt' })
    const [url] = (api as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('/upload?id=7')
    expect(ref.id).toBe(7)
  })

  it('the injectable write guard blocks upload and updateInfo BEFORE any network call', async () => {
    const api = vi.fn() as unknown as $Fetch
    const guard = () => { throw new Error('Demo mode: writes are disabled') }
    const lib = createStrapiMediaLibrary(api, guard)
    await expect(lib.upload(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))).rejects.toThrow(/writes are disabled/)
    await expect(lib.updateInfo(7, { alternativeText: 'X' })).rejects.toThrow(/writes are disabled/)
    expect(api).not.toHaveBeenCalled()
  })

  it('the guard does NOT gate reads', async () => {
    const api = vi.fn().mockResolvedValue([]) as unknown as $Fetch
    const guard = () => { throw new Error('Demo mode: writes are disabled') }
    await expect(createStrapiMediaLibrary(api, guard).list()).resolves.toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/media-library.test.ts`
Expected: FAIL — module `~/lib/media-library` does not exist.

- [ ] **Step 3: Write the implementation**

Create `app/lib/media-library.ts`:

```ts
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
    upload(file, info, filename) {
      assertWritable()
      return uploadFile(api, file, info, filename)
    },
    updateInfo(id, info) {
      assertWritable()
      return updateFileInfo(api, id, info)
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/media-library.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Align the demo lib's page-size constant (DRY)**

In `app/lib/demo-media-library.ts`: delete the local `DEMO_MEDIA_PAGE_SIZE` constant and import the shared one instead —

```ts
import { DEFAULT_MEDIA_PAGE_SIZE } from '~/lib/media-library'
```

and in `list(...)` replace `opts.pageSize ?? DEMO_MEDIA_PAGE_SIZE` with `opts.pageSize ?? DEFAULT_MEDIA_PAGE_SIZE`. (Type the factory's return as `MediaLibrary` too: `export function makeDemoMediaLibrary(deps: DemoMediaLibraryDeps = {}): MediaLibrary` with `import type { MediaLibrary } from '~/lib/media-library'` — the import is type-only so there is no runtime cycle.)

Run: `npx vitest run tests/unit/demo-media-library.test.ts tests/unit/media-library.test.ts`
Expected: PASS (16 tests).

- [ ] **Step 6: Commit**

```bash
git add app/lib/media-library.ts app/lib/demo-media-library.ts tests/unit/media-library.test.ts
git commit -m "feat(media): MediaLibrary seam — Strapi adapter with injectable write guard, shared page-size default"
```

---

### Task 4: `useMediaLibrary()` composable

**Files:**
- Create: `app/composables/useMediaLibrary.ts`
- Test: `tests/nuxt/use-media-library.test.ts`

**Interfaces:**
- Consumes: `makeDemoMediaLibrary`, `createStrapiMediaLibrary`, `prepareUpload` (exported from `app/composables/useUpload.ts`), `isDemoData`/`isDemoMode` from `~/lib/demo`.
- Produces (consumed by Tasks 5–8):
  `useMediaLibrary(): { list(opts?: BrowseOptions): Promise<MediaRef[]>; uploadImage(file: File, info?: UploadInfo): Promise<MediaRef>; updateInfo(id: number, info: UploadInfo): Promise<MediaRef> }`
  — auto-imported everywhere as `useMediaLibrary`.

- [ ] **Step 1: Write the failing test**

Create `tests/nuxt/use-media-library.test.ts`:

```ts
// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'

const demoLib = {
  list: vi.fn().mockResolvedValue([{ id: -1, url: '/images/demo/a.jpg' }]),
  upload: vi.fn().mockResolvedValue({ id: -25, url: 'blob:demo/z' }),
  updateInfo: vi.fn().mockResolvedValue({ id: -1, url: '/images/demo/a.jpg' }),
}
const strapiLib = {
  list: vi.fn().mockResolvedValue([{ id: 7, url: '/uploads/x.jpg' }]),
  upload: vi.fn().mockResolvedValue({ id: 8, url: '/uploads/y.jpg' }),
  updateInfo: vi.fn().mockResolvedValue({ id: 7, url: '/uploads/x.jpg' }),
}
const makeDemoMediaLibrary = vi.fn(() => demoLib)
const createStrapiMediaLibrary = vi.fn(() => strapiLib)
let demoData = false

vi.mock('~/lib/demo-media-library', () => ({ makeDemoMediaLibrary }))
vi.mock('~/lib/media-library', () => ({ createStrapiMediaLibrary, DEFAULT_MEDIA_PAGE_SIZE: 20 }))
vi.mock('~/lib/demo', () => ({
  isDemoData: () => demoData,
  isDemoMode: () => demoData,
  isDemoSession: () => false,
}))

// Probe component: grabs the composable in setup (needs the Nuxt app context).
type MediaApi = ReturnType<typeof import('~/composables/useMediaLibrary')['useMediaLibrary']>
let api!: MediaApi
const Probe = defineComponent({
  setup() {
    api = useMediaLibrary()
    return () => null
  },
})

describe('useMediaLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('selects the Strapi adapter for real sessions', async () => {
    demoData = false
    await mountSuspended(Probe)
    const refs = await api.list({ search: 'x' })
    expect(createStrapiMediaLibrary).toHaveBeenCalled()
    expect(makeDemoMediaLibrary).not.toHaveBeenCalled()
    expect(refs[0]!.id).toBe(7)
  })

  it('selects the in-memory demo adapter for demo-data sessions', async () => {
    demoData = true
    await mountSuspended(Probe)
    const refs = await api.list()
    expect(makeDemoMediaLibrary).toHaveBeenCalled()
    expect(refs[0]!.id).toBe(-1)
  })

  it('uploadImage gates by extension BEFORE reaching either adapter (parity with live)', async () => {
    demoData = true
    await mountSuspended(Probe)
    const bad = new File(['x'], 'evil.gif', { type: 'image/gif' })
    await expect(api.uploadImage(bad)).rejects.toThrow(/unsupported image type/i)
    expect(demoLib.upload).not.toHaveBeenCalled()
  })

  it('uploadImage passes gated files through to the adapter with info', async () => {
    demoData = true
    await mountSuspended(Probe)
    const ok = new File(['x'], 'chart.png', { type: 'image/png' })
    await api.uploadImage(ok, { alternativeText: 'Chart' })
    expect(demoLib.upload).toHaveBeenCalledWith(ok, { alternativeText: 'Chart' }, undefined)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/nuxt/use-media-library.test.ts`
Expected: FAIL — `useMediaLibrary` is not defined.

- [ ] **Step 3: Write the implementation**

Create `app/composables/useMediaLibrary.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/nuxt/use-media-library.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/composables/useMediaLibrary.ts tests/nuxt/use-media-library.test.ts
git commit -m "feat(media): useMediaLibrary — adapter selection by isDemoData, upload-gate parity for demo"
```

---

### Task 5: `MediaLibraryGrid.vue`

**Files:**
- Create: `app/components/MediaLibraryGrid.vue`
- Test: `tests/nuxt/media-library-grid.test.ts`

**Interfaces:**
- Consumes: `useMediaLibrary().list`, `DEFAULT_MEDIA_PAGE_SIZE`, `isDemoData`.
- Produces: `<MediaLibraryGrid @select="(ref: MediaRef) => …" />` with optional `pageSize` prop; exposes test seams `__load`, `__loadMore`, `__choose`, `__items`, `__search`, `__error`, `__exhausted`.

- [ ] **Step 1: Write the failing test**

Create `tests/nuxt/media-library-grid.test.ts`:

```ts
// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { MediaRef } from '~/types/content'

function ref(id: number, name: string, alt: string | null = 'Alt'): MediaRef {
  return { id, url: `/uploads/${name}`, name, alternativeText: alt, caption: null, width: null, height: null, mime: 'image/jpeg' }
}
const page1 = Array.from({ length: 20 }, (_, i) => ref(i + 1, `img-${i + 1}.jpg`))
const page2 = [ref(21, 'img-21.jpg'), ref(22, 'no-alt.jpg', null)]

const listMock = vi.fn()
mockNuxtImport('useMediaLibrary', () => () => ({
  list: listMock,
  uploadImage: vi.fn(),
  updateInfo: vi.fn(),
}))

import MediaLibraryGrid from '~/components/MediaLibraryGrid.vue'

describe('MediaLibraryGrid', () => {
  beforeEach(() => {
    listMock.mockReset()
    listMock.mockResolvedValue(page1)
  })

  it('loads and renders the first page on mount, newest first', async () => {
    const wrapper = await mountSuspended(MediaLibraryGrid)
    await new Promise((r) => setTimeout(r, 0))
    expect(listMock).toHaveBeenCalledWith({ page: 1, pageSize: 20, search: undefined })
    expect(wrapper.findAll('[data-test^="library-item-"]')).toHaveLength(20)
  })

  it('clicking a thumbnail emits select with that MediaRef', async () => {
    const wrapper = await mountSuspended(MediaLibraryGrid)
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.find('[data-test="library-item-3"]').trigger('click')
    const emitted = wrapper.emitted('select')![0]![0] as MediaRef
    expect(emitted.id).toBe(3)
  })

  it('Load more appends the next page and hides once a short page arrives', async () => {
    const wrapper = await mountSuspended(MediaLibraryGrid)
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('[data-test="library-load-more"]').exists()).toBe(true)
    listMock.mockResolvedValueOnce(page2)
    await wrapper.find('[data-test="library-load-more"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(listMock).toHaveBeenLastCalledWith({ page: 2, pageSize: 20, search: undefined })
    expect(wrapper.findAll('[data-test^="library-item-"]')).toHaveLength(22)
    expect(wrapper.find('[data-test="library-load-more"]').exists()).toBe(false)
  })

  it('search resets to page 1 and passes the trimmed term', async () => {
    const wrapper = await mountSuspended(MediaLibraryGrid)
    await new Promise((r) => setTimeout(r, 0))
    listMock.mockResolvedValueOnce([page1[0]!])
    wrapper.vm.$.exposed!.__search.value = ' img-1 '
    await wrapper.vm.$.exposed!.__load(true)
    expect(listMock).toHaveBeenLastCalledWith({ page: 1, pageSize: 20, search: 'img-1' })
    expect(wrapper.findAll('[data-test^="library-item-"]')).toHaveLength(1)
  })

  it('marks images that lack alt text with a "no alt text" badge', async () => {
    listMock.mockResolvedValue(page2)
    const wrapper = await mountSuspended(MediaLibraryGrid)
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('[data-test="no-alt-22"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="no-alt-21"]').exists()).toBe(false)
  })

  it('shows the empty state when the library has no images', async () => {
    listMock.mockResolvedValue([])
    const wrapper = await mountSuspended(MediaLibraryGrid)
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('[data-test="library-empty"]').text()).toContain('No images yet')
  })

  it('shows an inline error with Retry when loading fails, and Retry reloads', async () => {
    listMock.mockRejectedValueOnce(new Error('boom'))
    const wrapper = await mountSuspended(MediaLibraryGrid)
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('[data-test="library-error"]').exists()).toBe(true)
    listMock.mockResolvedValueOnce(page1)
    await wrapper.find('[data-test="library-retry"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.findAll('[data-test^="library-item-"]')).toHaveLength(20)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/nuxt/media-library-grid.test.ts`
Expected: FAIL — component `~/components/MediaLibraryGrid.vue` does not exist.

- [ ] **Step 3: Write the implementation**

Create `app/components/MediaLibraryGrid.vue`:

```vue
<!-- app/components/MediaLibraryGrid.vue -->
<!--
  MediaLibraryGrid: the shared "existing images" browser — newest ~20 Media Library images,
  whole-library name search (debounced), Load more paging, and a no-alt badge so authors see
  which images still need descriptions. Emits `select` with the chosen MediaRef; the CONSUMER
  owns what picking means (confirm panel / tray add). Works identically in demo-data sessions
  via useMediaLibrary()'s adapter seam; the demo note reminds presenters nothing persists.
-->
<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from '#imports'
import { DEFAULT_MEDIA_PAGE_SIZE } from '~/lib/media-library'
import { isDemoData } from '~/lib/demo'
import type { MediaRef } from '~/types/content'

const props = withDefaults(defineProps<{ pageSize?: number }>(), { pageSize: DEFAULT_MEDIA_PAGE_SIZE })
const emit = defineEmits<{ select: [ref: MediaRef] }>()

const { list } = useMediaLibrary()

const items = ref<MediaRef[]>([])
const search = ref('')
const page = ref(1)
const loading = ref(false)
const error = ref<string | null>(null)
const exhausted = ref(false)
const demoNote = isDemoData()

async function load(reset = false) {
  if (reset) {
    page.value = 1
    exhausted.value = false
  }
  loading.value = true
  error.value = null
  try {
    const batch = await list({ page: page.value, pageSize: props.pageSize, search: search.value.trim() || undefined })
    items.value = reset ? batch : [...items.value, ...batch]
    exhausted.value = batch.length < props.pageSize
  } catch {
    error.value = 'Could not load the media library.'
  } finally {
    loading.value = false
  }
}

function loadMore() {
  page.value += 1
  load()
}

function choose(item: MediaRef) {
  emit('select', item)
}

let debounce: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(debounce)
  debounce = setTimeout(() => load(true), 300)
})
onBeforeUnmount(() => clearTimeout(debounce))
onMounted(() => load(true))

// Test seams: route through the SAME functions the UI uses.
defineExpose({ __load: load, __loadMore: loadMore, __choose: choose, __items: items, __search: search, __error: error, __exhausted: exhausted })
</script>

<template>
  <div class="media-library-grid" data-test="media-library-grid">
    <UInput
      v-model="search"
      size="sm"
      icon="i-lucide-search"
      placeholder="Search library by file name"
      class="w-full"
      data-test="library-search"
    />
    <p v-if="demoNote" class="mt-1 text-xs text-muted" data-test="library-demo-note">
      Demo: images added here last only for this session and are never saved.
    </p>

    <p v-if="error" role="alert" class="mt-2 text-sm text-error" data-test="library-error">
      {{ error }}
      <UButton size="xs" variant="outline" class="ml-2" data-test="library-retry" @click="load(true)">
        Retry
      </UButton>
    </p>
    <p v-else-if="!loading && items.length === 0" class="mt-2 text-sm text-muted" data-test="library-empty">
      {{ search.trim() ? 'No images match.' : 'No images yet.' }}
    </p>

    <ul v-if="items.length" class="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4" data-test="library-items">
      <li v-for="item in items" :key="item.id">
        <button
          type="button"
          class="group w-full rounded border border-default p-1 text-left hover:border-primary"
          :data-test="`library-item-${item.id}`"
          @click="choose(item)"
        >
          <img :src="item.url" :alt="item.alternativeText ?? ''" class="h-16 w-full rounded object-cover" loading="lazy">
          <span class="mt-1 block truncate text-[11px] text-muted" :title="item.name">{{ item.name }}</span>
          <span
            v-if="!(item.alternativeText ?? '').trim()"
            class="mt-0.5 inline-block rounded bg-warning/15 px-1 text-[10px] text-warning"
            :data-test="`no-alt-${item.id}`"
          >no alt text</span>
        </button>
      </li>
    </ul>

    <div class="mt-2">
      <UButton
        v-if="!exhausted && items.length"
        size="xs"
        variant="outline"
        :loading="loading"
        data-test="library-load-more"
        @click="loadMore"
      >
        Load more
      </UButton>
      <span v-else-if="loading" class="text-xs text-muted" data-test="library-loading">Loading…</span>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/nuxt/media-library-grid.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add app/components/MediaLibraryGrid.vue tests/nuxt/media-library-grid.test.ts
git commit -m "feat(media): MediaLibraryGrid — newest-first thumbnails, search, load more, no-alt badge"
```

---

### Task 6: MediaPicker [Library | Upload] tabs

**Files:**
- Modify: `app/components/MediaPicker.vue` (full rework of the script + template; upload flow itself unchanged)
- Modify: `tests/nuxt/media-picker.test.ts`

**Interfaces:**
- Consumes: `MediaLibraryGrid` (Task 5), `useMediaLibrary().uploadImage/updateInfo` (Task 4), `useUpload().uploadDocument` (unchanged, `kind="file"` only).
- Produces: same public contract as today — `<MediaPicker kind="image|file" @select="(ref: MediaRef) => …" />` — with the `mode` prop **removed**. New exposed test seams: `__tab`, `__onLibrarySelect`, `__pickedAlt`, `__pickedCaption`, `__usePicked`, `__picked`, `__pickError`.

- [ ] **Step 1: Update the tests (failing first)**

In `tests/nuxt/media-picker.test.ts`, make these exact changes:

1. Replace the `useUpload` mock block (lines 14–23) with **two** mocks — `useUpload` keeps only the document path, and `useMediaLibrary` carries the image paths:

```ts
const uploadMock = vi.fn().mockResolvedValue(uploaded)          // now = uploadImage
const uploadDocumentMock = vi.fn().mockResolvedValue(uploadedDoc)
const updateInfoMock = vi.fn()
const listMock = vi.fn().mockResolvedValue([])

mockNuxtImport('useUpload', () => () => ({
  upload: vi.fn(),
  uploadDocument: uploadDocumentMock,
  browse: vi.fn(),
  remove: vi.fn(),
}))
mockNuxtImport('useMediaLibrary', () => () => ({
  list: listMock,
  uploadImage: uploadMock,
  updateInfo: updateInfoMock,
}))
```

2. In `beforeEach`, add `updateInfoMock.mockReset()` and `listMock.mockClear()`.

3. **Delete** the test `'in browse mode, selecting a tile emits its (url-based) MediaRef'` (the `mode` prop is gone).

4. In the test `'native file input is hidden …'`, switch to the Upload tab before querying (the upload block only renders there):

```ts
    const wrapper = await mountSuspended(MediaPicker)
    wrapper.vm.$.exposed!.__tab.value = 'upload'
    await wrapper.vm.$nextTick()
    const input = wrapper.find('input[type="file"]')
```

5. In `'renders alt text and caption fields'` (kind="image"), do the same tab switch before the `findAll`.

6. Append this new describe at the end of the file:

```ts
describe('Library tab (kind="image")', () => {
  const withAlt: MediaRef = {
    id: 7, url: '/uploads/photo.jpg', name: 'photo.jpg',
    alternativeText: 'A good photo', caption: null, width: null, height: null, mime: 'image/jpeg',
  }
  const withoutAlt: MediaRef = { ...withAlt, id: 8, name: 'bare.jpg', alternativeText: null }

  it('defaults to the Library tab for images; Upload tab is one click away', async () => {
    const wrapper = await mountSuspended(MediaPicker)
    expect(wrapper.find('[data-test="library-panel"]').exists()).toBe(true)
    expect(wrapper.find('input[type="file"]').exists()).toBe(false)
    await wrapper.find('[data-test="tab-upload"]').trigger('click')
    expect(wrapper.find('input[type="file"]').exists()).toBe(true)
  })

  it('kind="file" renders NO tabs — upload-only as before', async () => {
    const wrapper = await mountSuspended(MediaPicker, { props: { kind: 'file' } })
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
    expect(wrapper.find('input[type="file"]').exists()).toBe(true)
  })

  it('picking a library image WITH alt emits select immediately — no write-back', async () => {
    const wrapper = await mountSuspended(MediaPicker)
    await wrapper.vm.$.exposed!.__onLibrarySelect(withAlt)
    await wrapper.vm.$.exposed!.__usePicked()
    await new Promise((r) => setTimeout(r, 0))
    expect(updateInfoMock).not.toHaveBeenCalled()
    const ref = wrapper.emitted('select')![0]![0] as MediaRef
    expect(ref.id).toBe(7)
  })

  it('picking a library image WITHOUT alt gates on alt, then writes it back', async () => {
    updateInfoMock.mockResolvedValue({ ...withoutAlt, alternativeText: 'Typed alt' })
    const wrapper = await mountSuspended(MediaPicker)
    await wrapper.vm.$.exposed!.__onLibrarySelect(withoutAlt)

    // No alt yet → gated (no emit, no write).
    await wrapper.vm.$.exposed!.__usePicked()
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(updateInfoMock).not.toHaveBeenCalled()

    // Type alt → write-back runs and select carries the UPDATED ref.
    wrapper.vm.$.exposed!.__pickedAlt.value = 'Typed alt'
    await wrapper.vm.$.exposed!.__usePicked()
    await new Promise((r) => setTimeout(r, 0))
    expect(updateInfoMock).toHaveBeenCalledWith(8, { alternativeText: 'Typed alt' })
    const ref = wrapper.emitted('select')![0]![0] as MediaRef
    expect(ref.alternativeText).toBe('Typed alt')
  })

  it('a failed write-back keeps the pick open and shows a plain-language error', async () => {
    updateInfoMock.mockRejectedValue(new Error('403'))
    const wrapper = await mountSuspended(MediaPicker)
    await wrapper.vm.$.exposed!.__onLibrarySelect(withoutAlt)
    wrapper.vm.$.exposed!.__pickedAlt.value = 'Typed alt'
    await wrapper.vm.$.exposed!.__usePicked()
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(wrapper.vm.$.exposed!.__pickError.value).toMatch(/could not save/i)
  })
})
```

(Add `import type { MediaRef } from '~/types/content'` already exists at the top — reuse it.)

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run tests/nuxt/media-picker.test.ts`
Expected: FAIL — no `__tab` seam, no `data-test="library-panel"`, old image-upload tests may fail on the changed mock (that's fine at this stage).

- [ ] **Step 3: Rework the component**

Replace the **script** of `app/components/MediaPicker.vue` with:

```vue
<!-- app/components/MediaPicker.vue -->
<!--
  MediaPicker: LIBRARY-FIRST image picking. For kind="image" it renders [Library | Upload]
  tabs (Library default): the Library tab browses the Media Library (MediaLibraryGrid) with a
  pick-confirm panel that REQUIRES alt when the chosen image lacks it — the typed alt is
  written back to the media record (updateInfo; in-memory in demo) so the shared library
  improves. The Upload tab is the original eager-upload flow (alt REQUIRED before an image
  upload completes; caption optional), now routed through useMediaLibrary().uploadImage so it
  is demo-capable. Every emitted `url` is a Media Library URL or (demo sessions only) a blob:
  object URL — NEVER a data: URI (the zero-base64 invariant, design spec §7/§13).
  kind="file" (PDF/docs) is unchanged: upload-only, no tabs, no alt/caption, via
  useUpload().uploadDocument. The native <input type="file"> is always HIDDEN.
-->
<script setup lang="ts">
import { ref, computed } from '#imports'
import { ALLOWED_IMAGE_EXTENSIONS, ALLOWED_DOCUMENT_EXTENSIONS } from '~/lib/image-types'
import type { UploadInfo } from '~/lib/upload'
import type { MediaRef } from '~/types/content'

const props = withDefaults(defineProps<{ kind?: 'image' | 'file' }>(), { kind: 'image' })
const emit = defineEmits<{ select: [ref: MediaRef] }>()

const { uploadDocument } = useUpload()
const { uploadImage, updateInfo } = useMediaLibrary()

// Accept filter: images for kind="image", documents for kind="file".
const accept = computed(() =>
  props.kind === 'file'
    ? ALLOWED_DOCUMENT_EXTENSIONS.map((e) => `.${e}`).join(',')
    : ALLOWED_IMAGE_EXTENSIONS.map((e) => `.${e}`).join(','),
)

// --- tabs (images only; kind="file" renders the upload block directly) ---
const tab = ref<'library' | 'upload'>('library')
const showUploadBlock = computed(() => props.kind === 'file' || tab.value === 'upload')

// --- upload-new state (unchanged flow) ---
const fileInputRef = ref<HTMLInputElement | null>(null)
const file = ref<File | null>(null)
const alt = ref('')
const caption = ref('')
const busy = ref(false)
const error = ref<string | null>(null)
const submitted = ref(false)

const canSubmit = computed(() =>
  props.kind === 'file'
    ? !!file.value && !busy.value
    : !!file.value && alt.value.trim().length > 0 && !busy.value,
)
const altError = computed(() =>
  props.kind === 'image' && submitted.value && !alt.value.trim() ? 'Alt text is required' : undefined,
)

function setFile(f: File | null) { file.value = f; error.value = null }
function setAlt(v: string) { alt.value = v }
function setCaption(v: string) { caption.value = v }
function openFilePicker() { fileInputRef.value?.click() }

function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  setFile(input.files?.[0] ?? null)
}
function onDrop(e: DragEvent) {
  e.preventDefault()
  setFile(e.dataTransfer?.files?.[0] ?? null)
}

async function submit() {
  submitted.value = true
  if (!canSubmit.value || !file.value) return // alt-required gate (images only)
  busy.value = true
  error.value = null
  try {
    let mediaRef: MediaRef
    if (props.kind === 'file') {
      mediaRef = await uploadDocument(file.value)
    } else {
      mediaRef = await uploadImage(file.value, {
        alternativeText: alt.value.trim(),
        caption: caption.value.trim() || undefined,
      })
    }
    emit('select', mediaRef)
    file.value = null
    alt.value = ''
    caption.value = ''
    submitted.value = false
    if (fileInputRef.value) fileInputRef.value.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Upload failed.'
  } finally {
    busy.value = false
  }
}

// --- library pick-confirm state ---
const picked = ref<MediaRef | null>(null)
const pickedAlt = ref('')
const pickedCaption = ref('')
const pickBusy = ref(false)
const pickError = ref<string | null>(null)

const pickedNeedsAlt = computed(() => !!picked.value && !(picked.value.alternativeText ?? '').trim())
const canUsePicked = computed(() =>
  !!picked.value && !pickBusy.value && (!pickedNeedsAlt.value || pickedAlt.value.trim().length > 0),
)

function onLibrarySelect(mediaRef: MediaRef) {
  picked.value = mediaRef
  pickedAlt.value = ''
  pickedCaption.value = mediaRef.caption ?? ''
  pickError.value = null
}

async function usePicked() {
  if (!picked.value || !canUsePicked.value) return
  // Image already has alt → use as-is; existing alt is NEVER silently overwritten here.
  if (!pickedNeedsAlt.value) {
    emit('select', picked.value)
    picked.value = null
    return
  }
  // Missing alt → the typed alt is REQUIRED and written back to the shared record.
  pickBusy.value = true
  pickError.value = null
  try {
    const info: UploadInfo = { alternativeText: pickedAlt.value.trim() }
    if (pickedCaption.value.trim()) info.caption = pickedCaption.value.trim()
    const updated = await updateInfo(picked.value.id, info)
    emit('select', updated)
    picked.value = null
  } catch {
    pickError.value = 'Could not save the alt text. Please try again.'
  } finally {
    pickBusy.value = false
  }
}

function clearPicked() {
  picked.value = null
  pickError.value = null
}

// Exposed for component tests (and for parent-driven control).
defineExpose({
  setFile, setAlt, setCaption, submit, canSubmit, altError, openFilePicker,
  __tab: tab,
  __onLibrarySelect: onLibrarySelect,
  __usePicked: usePicked,
  __picked: picked,
  __pickedAlt: pickedAlt,
  __pickedCaption: pickedCaption,
  __pickError: pickError,
})
</script>
```

Replace the **template** with:

```vue
<template>
  <div class="media-picker">
    <!-- Tabs: images only. -->
    <div v-if="kind === 'image'" role="tablist" aria-label="Image source" class="mb-3 flex gap-1">
      <UButton
        role="tab"
        :aria-selected="tab === 'library' ? 'true' : 'false'"
        size="xs"
        :variant="tab === 'library' ? 'solid' : 'ghost'"
        data-test="tab-library"
        @click="tab = 'library'"
      >
        Library
      </UButton>
      <UButton
        role="tab"
        :aria-selected="tab === 'upload' ? 'true' : 'false'"
        size="xs"
        :variant="tab === 'upload' ? 'solid' : 'ghost'"
        data-test="tab-upload"
        @click="tab = 'upload'"
      >
        Upload
      </UButton>
    </div>

    <!-- Library tab -->
    <div v-if="kind === 'image' && tab === 'library'" role="tabpanel" data-test="library-panel">
      <MediaLibraryGrid @select="onLibrarySelect" />

      <div v-if="picked" class="mt-3 rounded border border-default p-3" data-test="pick-confirm">
        <div class="flex items-start gap-3">
          <img :src="picked.url" :alt="picked.alternativeText ?? ''" width="96" class="rounded border border-default object-cover">
          <div class="min-w-0 flex-1 text-sm">
            <p class="truncate font-medium" :title="picked.name">{{ picked.name }}</p>
            <p v-if="!pickedNeedsAlt" class="mt-1 text-xs text-muted">Alt text: {{ picked.alternativeText }}</p>
            <p v-else class="mt-1 text-xs text-warning" data-test="pick-needs-alt">
              This library image has no alt text.
            </p>
          </div>
          <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-x" aria-label="Cancel selection" @click="clearPicked" />
        </div>

        <template v-if="pickedNeedsAlt">
          <UFormField label="Alt text (required)" class="mt-3">
            <UInput
              :model-value="pickedAlt"
              placeholder="Describe the image for screen readers"
              class="w-full"
              data-test="picked-alt"
              @update:model-value="pickedAlt = $event as string"
            />
          </UFormField>
          <UFormField label="Caption (optional)" class="mt-3">
            <UInput
              :model-value="pickedCaption"
              placeholder="Optional caption shown beneath the image"
              class="w-full"
              data-test="picked-caption"
              @update:model-value="pickedCaption = $event as string"
            />
          </UFormField>
        </template>

        <p v-if="pickError" role="alert" class="mt-2 text-sm text-error" data-test="pick-error">{{ pickError }}</p>
        <UButton class="mt-3" :disabled="!canUsePicked" :loading="pickBusy" data-test="use-picked" @click="usePicked">
          Use this image
        </UButton>
      </div>
    </div>

    <!-- Upload block (Upload tab for images; always for kind="file") -->
    <div v-if="showUploadBlock">
      <!-- Hidden native file input — never renders "No file chosen" to the user. -->
      <input
        ref="fileInputRef"
        type="file"
        :accept="accept"
        class="sr-only"
        tabindex="-1"
        aria-hidden="true"
        @change="onFileInput"
      >

      <!-- Dropzone (drag-and-drop still works) -->
      <div
        class="dropzone border-2 border-dashed border-default rounded-lg p-4 text-center"
        @dragover.prevent
        @drop="onDrop"
      >
        <template v-if="!file">
          <p class="text-sm text-muted mb-2">
            {{ kind === 'file' ? 'Drag a document here, or choose a file.' : 'Drag an image here, or choose a file.' }}
          </p>
          <UButton size="sm" variant="outline" icon="i-lucide-upload" @click="openFilePicker">
            Choose file
          </UButton>
        </template>

        <template v-else>
          <div class="flex items-center gap-3 justify-center flex-wrap">
            <span class="text-sm font-medium truncate max-w-xs" :title="file.name">{{ file.name }}</span>
            <div class="flex gap-2">
              <UButton size="xs" variant="outline" icon="i-lucide-refresh-cw" @click="openFilePicker">
                Replace
              </UButton>
              <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-x" @click="setFile(null)">
                Remove
              </UButton>
            </div>
          </div>
        </template>
      </div>

      <!-- Alt text + caption: only for images -->
      <template v-if="kind === 'image'">
        <UFormField label="Alt text (required)" :error="altError" class="mt-3">
          <UInput
            :model-value="alt"
            placeholder="Describe the image for screen readers"
            class="w-full"
            @update:model-value="setAlt($event as string)"
          />
        </UFormField>
        <UFormField label="Caption (optional)" class="mt-3">
          <UInput
            :model-value="caption"
            placeholder="Optional caption shown beneath the image"
            class="w-full"
            @update:model-value="setCaption($event as string)"
          />
        </UFormField>
      </template>

      <p v-if="error" role="alert" class="text-sm text-error mt-2">{{ error }}</p>
      <UButton class="mt-3" :disabled="!canSubmit" @click="submit">Upload</UButton>
    </div>
  </div>
</template>
```

(Note `pickedNeedsAlt` and `canUsePicked` are used by the template — they're in the script above. The `mode` prop, `items`, `loadLibrary`, `choose`, and the old bare browse grid are gone.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/nuxt/media-picker.test.ts`
Expected: PASS — all remaining original tests plus the 5 new Library-tab tests.

- [ ] **Step 5: Check the two dependent test files still pass (they mock `useUpload`; MediaPicker now also needs the `useMediaLibrary` mock)**

Run: `npx vitest run tests/nuxt/media-field.test.ts tests/nuxt/body-images-field.test.ts`
Expected: **media-field FAILS** (its MediaPicker child now calls `useMediaLibrary`, unmocked). Add to `tests/nuxt/media-field.test.ts`, directly below its existing `mockNuxtImport('useUpload', …)` block:

```ts
mockNuxtImport('useMediaLibrary', () => () => ({
  list: vi.fn().mockResolvedValue([]),
  uploadImage: uploadMock,       // the file's existing image-upload mock
  updateInfo: vi.fn().mockResolvedValue(null),
}))
```

(If the file's image-upload mock has a different local name, wire that name; the intent is: MediaField's image submits flow through `uploadImage` now.) `body-images-field.test.ts` is fully updated in Task 8.
Re-run: `npx vitest run tests/nuxt/media-field.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/components/MediaPicker.vue tests/nuxt/media-picker.test.ts tests/nuxt/media-field.test.ts
git commit -m "feat(media): MediaPicker Library|Upload tabs — library-first picks with alt-gated write-back"
```

---

### Task 7: MediaField alt/caption persistence (the quirk fix)

**Files:**
- Modify: `app/components/fields/MediaField.vue`
- Modify: `tests/nuxt/media-field.test.ts`

**Interfaces:**
- Consumes: `useMediaLibrary().updateInfo`.
- Produces: unchanged public contract; new exposed seam `__persistInfo` and `__persistError`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/nuxt/media-field.test.ts` (reuse its existing helpers for mounting with a selected image `modelValue`; the `updateInfo` mock from Task 6 Step 5 needs to be a named const — rename it `updateInfoMock` and reference it in the mock block):

```ts
describe('alt/caption persistence (quirk fix)', () => {
  const selected: MediaRef = {
    id: 42, url: '/uploads/pic.jpg', name: 'pic.jpg',
    alternativeText: 'Original alt', caption: 'Original caption',
    width: null, height: null, mime: 'image/jpeg',
  }

  beforeEach(() => updateInfoMock.mockReset())

  it('persists changed alt via updateInfo on commit (blur)', async () => {
    updateInfoMock.mockResolvedValue({ ...selected, alternativeText: 'New alt' })
    const wrapper = await mountSuspended(MediaField, {
      props: { modelValue: selected, label: 'Main image' },
    })
    await wrapper.find('[data-test="selected-alt"]').setValue('New alt')
    await wrapper.vm.$.exposed!.__persistInfo()
    expect(updateInfoMock).toHaveBeenCalledWith(42, { alternativeText: 'New alt', caption: 'Original caption' })
  })

  it('does NOT call updateInfo when nothing changed', async () => {
    const wrapper = await mountSuspended(MediaField, {
      props: { modelValue: selected, label: 'Main image' },
    })
    await wrapper.vm.$.exposed!.__persistInfo()
    expect(updateInfoMock).not.toHaveBeenCalled()
  })

  it('does NOT call updateInfo for display-only refs (id 0)', async () => {
    const wrapper = await mountSuspended(MediaField, {
      props: { modelValue: { ...selected, id: 0 }, label: 'Main image' },
    })
    await wrapper.find('[data-test="selected-alt"]').setValue('New alt')
    await wrapper.vm.$.exposed!.__persistInfo()
    expect(updateInfoMock).not.toHaveBeenCalled()
  })

  it('never persists an EMPTY alt (the required-field error owns that state)', async () => {
    const wrapper = await mountSuspended(MediaField, {
      props: { modelValue: selected, label: 'Main image' },
    })
    await wrapper.find('[data-test="selected-alt"]').setValue('')
    await wrapper.vm.$.exposed!.__persistInfo()
    expect(updateInfoMock).not.toHaveBeenCalled()
  })

  it('shows a field-level error when persistence fails, keeping the local value', async () => {
    updateInfoMock.mockRejectedValue(new Error('403'))
    const wrapper = await mountSuspended(MediaField, {
      props: { modelValue: selected, label: 'Main image' },
    })
    await wrapper.find('[data-test="selected-alt"]').setValue('New alt')
    await wrapper.vm.$.exposed!.__persistInfo()
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.vm.$.exposed!.__persistError.value).toMatch(/could not save/i)
    expect(wrapper.find('[data-test="persist-error"]').exists()).toBe(true)
  })
})
```

(`MediaField` is already imported in this file; `MediaRef` too. `setValue` on the input triggers the component's `update:modelValue` emit — the test passes the updated model back automatically via `mountSuspended`'s v-model handling only if props are reactive; if the existing tests re-mount with updated props instead, follow that file's established pattern for simulating the alt edit — the exposed `__persistInfo` seam reads current props either way.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/nuxt/media-field.test.ts`
Expected: FAIL — `__persistInfo` is not exposed.

- [ ] **Step 3: Implement persistence**

In `app/components/fields/MediaField.vue` script, add after the existing `emit`/`computed` declarations:

```ts
const { updateInfo } = useMediaLibrary()

// Last-persisted alt/caption for the CURRENT media id — persistInfo only fires on a real change.
const persistError = ref<string | null>(null)
const persistedAlt = ref('')
const persistedCaption = ref('')
watch(
  () => current.value?.id,
  () => {
    persistError.value = null
    persistedAlt.value = current.value?.alternativeText ?? ''
    persistedCaption.value = current.value?.caption ?? ''
  },
  { immediate: true },
)

/**
 * Persist alt/caption edits to the media record on commit (blur). Skips display-only refs
 * (id 0 — dev sample content), empty alt (the required-field error owns that state), and
 * no-op edits. Demo/session refs (negative ids) persist through the demo adapter in-memory.
 * On failure the local value is kept so the author can retry.
 */
async function persistInfo() {
  const mediaRef = current.value
  if (!mediaRef || !isImage.value || mediaRef.id === 0) return
  const altValue = (mediaRef.alternativeText ?? '').trim()
  const captionValue = (mediaRef.caption ?? '').trim()
  if (!altValue) return
  if (altValue === persistedAlt.value.trim() && captionValue === persistedCaption.value.trim()) return
  persistError.value = null
  try {
    const updated = await updateInfo(mediaRef.id, { alternativeText: altValue, caption: captionValue })
    persistedAlt.value = updated.alternativeText ?? ''
    persistedCaption.value = updated.caption ?? ''
  } catch {
    persistError.value = 'Could not save the image details to the library. Retry by editing the field again.'
  }
}
```

Add `watch` to the `#imports` import (`import { ref, computed, watch } from '#imports'`), and extend `defineExpose`:

```ts
defineExpose({ clear, __persistInfo: persistInfo, __persistError: persistError })
```

In the template, add `@blur="persistInfo"` to both selected-state inputs (`data-test="selected-alt"` and `data-test="selected-caption"`), and directly after the caption `UFormField` add:

```vue
        <p v-if="persistError" role="alert" class="mt-2 text-sm text-error" data-test="persist-error">
          {{ persistError }}
        </p>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/nuxt/media-field.test.ts`
Expected: PASS (all existing + 5 new).

- [ ] **Step 5: Commit**

```bash
git add app/components/fields/MediaField.vue tests/nuxt/media-field.test.ts
git commit -m "fix(media): persist MediaField alt/caption edits to the media record (updateFileInfo) — edits were silently dropped on save"
```

---

### Task 8: BodyImagesField — Add from library, drop the demo auto-seed

**Files:**
- Modify: `app/components/forms/BodyImagesField.vue`
- Modify: `tests/nuxt/body-images-field.test.ts`

**Interfaces:**
- Consumes: `MediaLibraryGrid`, `useMediaLibrary().uploadImage/updateInfo`.
- Produces: unchanged public contract (`@insert` with markdown); new exposed seams `__onLibraryPick`, `__confirmPendingPick`, `__pendingPick`, `__pendingAlt`, `__libraryOpen`, `__pickError`.

- [ ] **Step 1: Update mocks and write the failing tests**

In `tests/nuxt/body-images-field.test.ts`:

1. Replace the `useUpload` mock (line 12) with:

```ts
const uploadMock = vi.fn()
const updateInfoMock = vi.fn()
mockNuxtImport('useUpload', () => () => ({ upload: vi.fn(), uploadDocument: vi.fn(), browse: vi.fn(), remove: vi.fn() }))
mockNuxtImport('useMediaLibrary', () => () => ({
  list: vi.fn().mockResolvedValue([]),
  uploadImage: uploadMock,
  updateInfo: updateInfoMock,
}))
```

(Keep whatever resolved value the old `uploadMock` used — the existing upload-path tests drive `__handleFiles`, which now calls `uploadImage`.)

2. Append the new describe:

```ts
describe('Add from library', () => {
  const libWithAlt: MediaRef = {
    id: -3, url: '/images/demo/photo.jpg', name: 'photo.jpg',
    alternativeText: 'Library photo', caption: 'Lib caption', width: null, height: null, mime: 'image/jpeg',
  }
  const libNoAlt: MediaRef = { ...libWithAlt, id: -4, name: 'bare.jpg', alternativeText: null, caption: null }

  beforeEach(() => updateInfoMock.mockReset())

  it('does NOT auto-seed the tray anymore (empty on mount, demo or not)', async () => {
    const wrapper = await mountSuspended(BodyImagesField)
    expect(wrapper.find('[data-test="body-images-empty"]').exists()).toBe(true)
  })

  it('renders an Add from library toggle that reveals the grid', async () => {
    const wrapper = await mountSuspended(BodyImagesField)
    expect(wrapper.find('[data-test="library-in-tray"]').exists()).toBe(false)
    await wrapper.find('[data-test="add-from-library"]').trigger('click')
    expect(wrapper.find('[data-test="library-in-tray"]').exists()).toBe(true)
  })

  it('a picked image WITH alt joins the tray seeded with the library alt/caption', async () => {
    const wrapper = await mountSuspended(BodyImagesField)
    await wrapper.vm.$.exposed!.__onLibraryPick(libWithAlt)
    const tray = wrapper.vm.$.exposed!.__trayImages.value
    expect(tray).toHaveLength(1)
    expect(tray[0]!.alt).toBe('Library photo')
    expect(tray[0]!.caption).toBe('Lib caption')
    expect(updateInfoMock).not.toHaveBeenCalled()
  })

  it('a picked image WITHOUT alt gates on alt, writes it back, then joins the tray', async () => {
    updateInfoMock.mockResolvedValue({ ...libNoAlt, alternativeText: 'Typed alt' })
    const wrapper = await mountSuspended(BodyImagesField)
    await wrapper.vm.$.exposed!.__onLibraryPick(libNoAlt)
    expect(wrapper.vm.$.exposed!.__trayImages.value).toHaveLength(0)
    expect(wrapper.vm.$.exposed!.__pendingPick.value?.id).toBe(-4)

    // Confirm without alt → no-op.
    await wrapper.vm.$.exposed!.__confirmPendingPick()
    expect(updateInfoMock).not.toHaveBeenCalled()

    // Type alt → write-back + tray add with the updated alt.
    wrapper.vm.$.exposed!.__pendingAlt.value = 'Typed alt'
    await wrapper.vm.$.exposed!.__confirmPendingPick()
    await new Promise((r) => setTimeout(r, 0))
    expect(updateInfoMock).toHaveBeenCalledWith(-4, { alternativeText: 'Typed alt', caption: '' })
    const tray = wrapper.vm.$.exposed!.__trayImages.value
    expect(tray).toHaveLength(1)
    expect(tray[0]!.alt).toBe('Typed alt')
  })

  it('a failed write-back shows an error and does not add to the tray', async () => {
    updateInfoMock.mockRejectedValue(new Error('403'))
    const wrapper = await mountSuspended(BodyImagesField)
    await wrapper.vm.$.exposed!.__onLibraryPick(libNoAlt)
    wrapper.vm.$.exposed!.__pendingAlt.value = 'Typed alt'
    await wrapper.vm.$.exposed!.__confirmPendingPick()
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.vm.$.exposed!.__trayImages.value).toHaveLength(0)
    expect(wrapper.vm.$.exposed!.__pickError.value).toMatch(/could not save/i)
  })
})
```

(Add `import type { MediaRef } from '~/types/content'` if not already imported. If the existing test file carries a test asserting the demo auto-seed, **delete that test** — the behavior is deliberately removed per the spec.)

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run tests/nuxt/body-images-field.test.ts`
Expected: FAIL — no `__onLibraryPick`; the auto-seed test (if present) contradicts.

- [ ] **Step 3: Implement**

In `app/components/forms/BodyImagesField.vue`:

1. **Imports:** remove `onMounted` from the `#imports` line, remove the `isDemoMode` and `sampleFigureRef` imports, remove `useUpload`; add:

```ts
import { useMediaLibrary } from '~/composables/useMediaLibrary'
import type { UploadInfo } from '~/lib/upload'
```

(`useMediaLibrary` is auto-imported; the explicit import matches the file's existing explicit-import style for `useUpload`.)

2. **Composable:** replace `const { upload } = useUpload()` with:

```ts
const { uploadImage, updateInfo } = useMediaLibrary()
```

and in `handleFiles`, replace `const mediaRef = await upload(file)` with `const mediaRef = await uploadImage(file)`.

3. **Delete** the whole `onMounted(() => { … demo seed … })` block (lines 125–135 in the current file).

4. **Add library state + handlers** (after `removeFromTray`):

```ts
// --- Add from library ---
const libraryOpen = ref(false)
const pendingPick = ref<MediaRef | null>(null) // a library pick that still needs REQUIRED alt
const pendingAlt = ref('')
const pickBusy = ref(false)
const pickError = ref<string | null>(null)

/** A library pick with alt joins the tray directly; one without alt waits for required alt. */
function onLibraryPick(mediaRef: MediaRef) {
  pickError.value = null
  if ((mediaRef.alternativeText ?? '').trim()) {
    addToTray(mediaRef, mediaRef.name ?? 'library image')
    return
  }
  pendingPick.value = mediaRef
  pendingAlt.value = ''
}

/** Write the typed alt back to the record (in-memory in demo), then add to the tray. */
async function confirmPendingPick() {
  if (!pendingPick.value || !pendingAlt.value.trim() || pickBusy.value) return
  pickBusy.value = true
  pickError.value = null
  try {
    const info: UploadInfo = { alternativeText: pendingAlt.value.trim(), caption: pendingPick.value.caption ?? '' }
    const updated = await updateInfo(pendingPick.value.id, info)
    addToTray(updated, updated.name ?? 'library image')
    pendingPick.value = null
    pendingAlt.value = ''
  } catch {
    pickError.value = 'Could not save the alt text. Please try again.'
  } finally {
    pickBusy.value = false
  }
}

function cancelPendingPick() {
  pendingPick.value = null
  pendingAlt.value = ''
  pickError.value = null
}
```

5. **Extend `defineExpose`** with:

```ts
  __onLibraryPick: onLibraryPick,
  __confirmPendingPick: confirmPendingPick,
  __pendingPick: pendingPick,
  __pendingAlt: pendingAlt,
  __libraryOpen: libraryOpen,
  __pickError: pickError,
```

6. **Template:** inside the upload row `div` (the one with the Upload images button), add after the `<span>or drag & drop here</span>`:

```vue
        <UButton size="xs" variant="outline" icon="i-lucide-images" data-test="add-from-library" @click="libraryOpen = !libraryOpen">
          Add from library
        </UButton>
```

and directly after that row's closing `</div>` (before the hint `<p>`), add:

```vue
      <div v-if="libraryOpen" class="mt-2" data-test="library-in-tray">
        <MediaLibraryGrid @select="onLibraryPick" />
        <div v-if="pendingPick" class="mt-2 rounded border border-default p-2" data-test="tray-pick-confirm">
          <p class="text-xs text-warning">"{{ pendingPick.name }}" has no alt text yet.</p>
          <UFormField class="mt-1">
            <template #label><span class="text-xs">Alt text (required)</span></template>
            <UInput
              v-model="pendingAlt"
              size="xs"
              placeholder="Describe the image for screen readers"
              class="w-full"
              data-test="pending-alt"
            />
          </UFormField>
          <p v-if="pickError" role="alert" class="mt-1 text-xs text-error" data-test="tray-pick-error">{{ pickError }}</p>
          <div class="mt-2 flex gap-2">
            <UButton size="xs" :disabled="!pendingAlt.trim() || pickBusy" :loading="pickBusy" data-test="confirm-pending-pick" @click="confirmPendingPick">
              Add to tray
            </UButton>
            <UButton size="xs" color="neutral" variant="ghost" data-test="cancel-pending-pick" @click="cancelPendingPick">
              Cancel
            </UButton>
          </div>
        </div>
      </div>
```

7. Update the header comment block (lines 2–16) to describe the new reality — replace the sentence about demo seeding with:

```
  It OWNS the body-image tray: upload-from-desktop AND "Add from library" (MediaLibraryGrid →
  alt-gated pick, write-back for alt-less images). No auto-seeding: new articles start empty;
  in demo the seeded demo library (photos + figures) is one click away via Add from library.
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/nuxt/body-images-field.test.ts`
Expected: PASS (existing upload/insert tests + 5 new).

- [ ] **Step 5: Commit**

```bash
git add app/components/forms/BodyImagesField.vue tests/nuxt/body-images-field.test.ts
git commit -m "feat(editor): Add-from-library in the body-images tray — alt-gated picks; demo auto-seed removed (library replaces it)"
```

---

### Task 9: Demo CSP `blob:` + header guard tests

**Files:**
- Modify: `deploy/headers-demo.txt`
- Modify: `tests/unit/security-headers.test.ts`

**Interfaces:** none new — this is the deliberate, test-guarded CSP change from spec §6.

- [ ] **Step 1: Write the failing tests**

In `tests/unit/security-headers.test.ts`, add a helper next to the existing `connectSrcOf` and two tests inside the demo-headers describe (`deploy/headers-demo.txt (public-demo backstop …)`), plus one in the production describe:

```ts
function imgSrcOf(headerText: string): string {
  const match = headerText.match(/img-src\s+([^;]+)/)
  return match?.[1]?.trim() ?? ''
}
```

```ts
  it("demo img-src permits blob: — session-only demo uploads render from object URLs (spec 2026-07-16, media-library picker)", () => {
    expect(imgSrcOf(demoHeaders)).toBe("'self' data: blob:")
  })
```

And in the production (`public/_headers`) describe:

```ts
  it('production img-src does NOT permit blob: — live never renders object URLs', () => {
    expect(imgSrcOf(headers)).not.toContain('blob:')
    expect(imgSrcOf(headers)).toContain("'self'")
  })
```

(Use the file's existing variable names for the two header strings — `headers` for `public/_headers` and `demoHeaders` for `deploy/headers-demo.txt`.)

- [ ] **Step 2: Run tests to verify the demo one fails**

Run: `npx vitest run tests/unit/security-headers.test.ts`
Expected: FAIL — demo `img-src` is currently `'self' data:`. (The production test passes already — it's the regression guard.)

- [ ] **Step 3: Make the CSP change**

In `deploy/headers-demo.txt`, in the `Content-Security-Policy:` line, change

```
img-src 'self' data:;
```

to

```
img-src 'self' data: blob:;
```

and extend the comment block above it with one line:

```
#     img-src adds blob: — demo-only session uploads render from object URLs (never data:,
#     never persisted; see docs/superpowers/specs/2026-07-16-media-library-picker-design.md §6).
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/security-headers.test.ts`
Expected: PASS (all, including both new tests).

- [ ] **Step 5: Commit**

```bash
git add deploy/headers-demo.txt tests/unit/security-headers.test.ts
git commit -m "feat(security): demo CSP img-src gains blob: for session-only demo uploads — guard tests lock both header sets"
```

---

### Task 10: Documentation, full verification, sandbox note

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `docs/ICJIA-Studio-20-rewrite-copperhead.md`
- Modify: `docs/demo-to-production.md`

**Interfaces:** none — documentation + the full-suite gate.

- [ ] **Step 1: Full verification**

```bash
npm test          # expect: ~710 tests / 101 files, ALL passing (677 + ~33 new)
npm run typecheck # expect: exit 0, zero errors
```

If anything fails, fix it before touching docs.

- [ ] **Step 2: CHANGELOG entry**

Under `## [Unreleased]` in `CHANGELOG.md`, add a dated block at the top:

```markdown
### 2026-07-16

_Added_

- **Media-library picker (library-first images, demo parity).** Every image surface — main
  image, thumbnail, and the body-images tray — now opens on a **Library** tab showing the ~20
  newest Media Library images (whole-library name search, Load more), with **Upload** as the
  second tab. Picking a library image that lacks alt text requires typing it, and the typed
  alt is **written back to the media record** (new `updateFileInfo`; in-memory in demo) so the
  shared library improves. Works identically in the public demo: the demo library is seeded
  from the bundled sample photos + figures, and desktop adds are session-only `blob:` object
  URLs with negative ids that `mediaIdForWrite` structurally drops (never persisted, never
  networked). The demo CSP `img-src` deliberately gains `blob:` (guard-tested in both
  directions). Spec: `docs/superpowers/specs/2026-07-16-media-library-picker-design.md`.

_Fixed_

- **Alt/caption edits after upload now persist.** `MediaField`'s selected-state alt/caption
  edits previously updated only the local form model and were silently dropped on save (only
  the numeric media id is written); they now persist to the media record on commit via
  `updateFileInfo`.

_Changed_

- **Body-images tray no longer auto-seeds sample figures in demo.** The demo's 8 sample
  figures now live in the demo media library, one click away via **Add from library** —
  new articles start with an empty tray everywhere.
```

- [ ] **Step 3: README feature bullet**

In `README.md`, in the built-features paragraph/list (the one naming the body-image gallery and card view), add:

```markdown
- **Library-first image picking** — every image field opens on the Media Library's newest
  images (searchable) with upload-from-desktop one tab away; alt-less library picks require
  alt text and write it back to the shared record. Fully functional in the public demo
  (session-only, never persisted).
```

- [ ] **Step 4: Design-spec status row**

In `docs/ICJIA-Studio-20-rewrite-copperhead.md`, in the **Status at a glance** table (§3), after the "Body-image gallery" row, add:

```markdown
| Media-library picker (browse ~20 newest, search, upload tab) | Reuse existing library images; alt write-back for alt-less picks | **Built** |
```

- [ ] **Step 5: Runbook Strapi checklist item**

In `docs/demo-to-production.md`, in the Strapi-side setup checklist, add:

```markdown
- [ ] **Media Library update permission:** grant the Author and Editor roles the upload
  plugin's *update file info* action — the Studio's library picker writes alt text back to
  alt-less images (`POST /upload?id=<id>` with `fileInfo`). Verify during the staging
  rehearsal: pick an alt-less image as an Author, supply alt, confirm the record updates.
```

- [ ] **Step 6: Sandbox verification of `updateFileInfo` (conditional)**

If sandbox admin credentials are available locally (`.env`), verify the endpoint shape read-only-safely against a throwaway upload and update the header comment in `app/lib/upload.ts` from "verify against the live sandbox" to "validated against the live sandbox 2026-07-16". If credentials are NOT available, leave the comment as-is — the runbook item from Step 5 covers it at the staging rehearsal. Do not guess.

- [ ] **Step 7: Final full run + commit**

```bash
npm test && npm run typecheck
git add CHANGELOG.md README.md docs/ICJIA-Studio-20-rewrite-copperhead.md docs/demo-to-production.md app/lib/upload.ts
git commit -m "docs: media-library picker — changelog, README, spec status row, runbook update-permission item"
```

---

## Plan self-review (done at authoring time)

- **Spec coverage:** §1 scope → Tasks 5–8; §2 decisions → Tasks 2 (ids), 5 (page size/search), 6 (tabs, alt policy), 9 (CSP); §3 architecture → Tasks 1–4; §4 components → Tasks 5–8; §5 demo table → Tasks 2/4/9; §6 security → Tasks 3 (guard), 9 (CSP + invariant in Task 2's tests), 10 (runbook permission); §7 errors → grid/pick/persist error states in Tasks 5–8; §8 testing → each task's tests; §9 docs → Task 10. The editor inline paste/drop pipeline stays on `useUpload` (spec out-of-scope) — untouched.
- **Type consistency:** `MediaLibrary` methods are `list(opts?: BrowseOptions)`, `upload(file, info?, filename?)`, `updateInfo(id, info)` everywhere; composable exposes `list` / `uploadImage` / `updateInfo`; all component mocks use those three names.
- **Placeholders:** none — every step carries the code or the exact edit.
