# Media & Zero-Base64 — Implementation Plan

> **Plan 3 of the ICJIA Studio build.** Follows the auth plan and the data-layer plan; precedes the editor/forms integration (Plan 4/5). Delivers the tested media building blocks (upload lib, SVG sanitizer, `useUpload`, `MediaPicker`, `ImageDropzone`) that those later plans wire in.

> **Draft 1 — first iteration.** Part of an exploratory first pass; expect the approach to evolve as the build surfaces requirements (e.g. the data layer itself was revised mid-build from REST → Content-Manager API; the upload mechanics below were re-validated against the live sandbox on 2026-06-20).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

## 📋 For managers — what is this, and is it legit?

**What this document is.** The construction recipe for the Studio's **image and file handling** — the part that lets an author add a picture to an article *the right way*. The login plan came first, then the content engine; this is the piece that moves images.

**Why this plan exists at all.** The single most important rule in this whole project: **no image is ever stored as a giant blob of text ("base64").** The old tool did exactly that — it photocopied each picture into the record, bloating the database and slowing everything down. The new Studio uploads every picture **once** to a shared media library and then references it by link. This plan turns that promise into automated tests that fail the build if anyone ever sneaks a base64 image into the app.

**Is it real, or jargon?** Real, and routine:
- Every small step **writes a test first, then the code** (Test-Driven Development).
- Every step ends in a **save point** (a commit) — traceable and reversible.
- We **verified the real upload system first** (against the live content system on 2026-06-20) so the code matches reality, not guesses — including the exact upload address, the exact response shape, and how alt-text/captions are attached.

**What you get when this plan is done.** Tested, reusable building blocks: an author can drag-and-drop an image (or pick one already in the library), it uploads instantly, a real preview appears (never a temporary in-browser copy that could get saved by accident), alt-text is required for accessibility, and clicking a thumbnail drops the picture into the article. One extra safety step: drawings in SVG format are scrubbed of any hidden code before upload. The screens that *use* these blocks — the editor and the content forms — arrive in the next plans.

**Bottom line.** Legitimate, careful plumbing for the project's headline promise — written in detail so the "no base64 images" rule is guaranteed by tests rather than hope, and so images are handled safely (alt-text for accessibility, SVG scrubbed for security).

---

**Goal:** Build the typed, tested **media layer** for the Studio: a pure DI upload library (`uploadFile` / `listMediaFiles` / `deleteMediaFile`) over Strapi's Upload API, a client-side SVG sanitizer (DOMPurify), a thin `useUpload` composable, and two components — `MediaPicker` (upload-new + pick-existing) and `ImageDropzone` (drag-drop → eager-upload → click-to-insert markdown). The non-negotiable outcome: **zero base64 / no `data:` URLs ever enter app state**, enforced by tests. The data layer's `*ToWrite` mappers consume the numeric file `id` this layer mints; the editor/forms integration that *calls* these blocks is **deferred to Plan 4/5**.

**Architecture:** Pure, dependency-injected functions hold all logic (mirroring `lib/auth.ts` + `lib/repository.ts`): `lib/upload.ts` and `lib/sanitize-svg.ts` are plain functions over a `$Fetch` client / `File` / strings. The `useUpload` composable is one-line wiring that binds `$api` (exactly like `useAuth`). Components are thin over the composable. Logic is unit-tested against fakes; components are tested with `mountSuspended` under the Nuxt env with `useUpload` mocked — no network in any test.

**Tech Stack:** Nuxt 4 (SPA), Vue 3.5, Pinia, TypeScript, `ofetch` (`$api`), Vitest + `@nuxt/test-utils` (happy-dom + the `nuxt` runtime env), DOMPurify.

## Global Constraints

*Every task's requirements implicitly include this section. Values are copied from the design spec (`docs/superpowers/specs/2026-06-19-researchhub-studio-2026-design.md` §7 image/file handling, §13 testing) and confirmed by introspection against the live sandbox on 2026-06-20.*

- **Stack:** Nuxt 4 **SPA** (`ssr: false`), Nuxt UI 4, Pinia, **TypeScript**. HTTP via the existing `ofetch` `$api` client (carries the admin JWT + base URL).
- **ZERO base64 / no `data:` URLs — the headline invariant.** Uploads produce a **Media Library reference**: a numeric `id` (for content writes) and a `url` (for display). A preview is **ALWAYS the returned `url`**, never a client-side `data:` URI or `URL.createObjectURL` blob that could be persisted. **No path in this layer may yield a `data:` URL into emitted or persisted state.** This is asserted in unit *and* component tests (per spec §13: "component tests for `MediaPicker` asserting no `data:` URLs ever enter state").
- **Media id → content (the seam with the data layer):** the numeric `id` is what the data layer's `mediaIdForWrite` sends on content writes; the `url` goes into `images[].src` and into the markdown body as `![alt](url "caption")`. This layer **produces** `MediaRef`; it does not itself write content entries.
- **Reused, do NOT recreate:**
  - `app/lib/strapi-rest.ts` → `mediaFromStrapi(StrapiMedia): MediaRef | null` (maps a raw uploaded-file object to a `MediaRef`).
  - `app/types/content.ts` → `MediaRef = { id, url, name?, alternativeText?, caption?, width?, height?, mime? }`.
  - `app/lib/image-types.ts` → `ALLOWED_IMAGE_EXTENSIONS` (`['jpg','jpeg','png','svg']`) + `hasAllowedImageExtension(urlOrName)` (the shared accept-filter / reject source of truth).
  - `app/lib/auth.ts` + `app/composables/useAuth.ts` → the **DI-pure-function + thin-composable** pattern to MIRROR.
  - `app/lib/repository.ts` → the DI style (`$Fetch` injected as `api`).
- **Strapi Upload API contract (confirmed against the live sandbox 2026-06-20 — use verbatim):**
  - **Upload:** `POST /upload` (admin JWT, multipart `FormData`). Append the field **`files`** (the `File`/`Blob`) and an optional field **`fileInfo`** = `JSON.stringify({ alternativeText, caption, name? })`. `fileInfo` sets alt + caption **at upload time** (verified). Returns **201** with the file object(s) **directly** — an **array** when one or more files (take `[0]` for a single upload): `{ id, documentId, name, url, mime, ext, size, width, height, formats, alternativeText, caption, previewUrl, … }`. Map the returned object through `mediaFromStrapi` → `MediaRef`.
  - **Browse Media Library:** `GET /upload/files` (admin JWT) → a **plain array** of file objects (same shape). Supports `pagination[page]`, `pagination[pageSize]`, `filters[name][$containsi]=<search>`, `sort=createdAt:DESC`.
  - **Delete:** `DELETE /upload/files/:id` (admin JWT) → 200.
  - **Endpoints are `/upload` + `/upload/files`** (NOT `/api/upload`). Auth is the admin JWT, attached automatically by the existing `$api` client; the libs take `$Fetch` by **DI**, the composable binds `$api`.
- **Accessibility:** **alt-text is required at the UX layer** before an upload completes; **caption is optional**. Both are set via `fileInfo` on upload (and stored natively on the file). The `MediaPicker`/`ImageDropzone` enforce the alt-required gate.
- **Allowed formats:** jpg / jpeg / png / svg via `hasAllowedImageExtension` — reject anything else with a clear message; **do not over-reject** valid files (v1's mistake). The data layer already exposes this allowlist as the single source of truth.
- **SVG safety:** an SVG is **sanitized client-side with DOMPurify (SVG profile) BEFORE upload** — strip `<script>`, `on*` event handlers, and external entity / `xlink:href` references. `dompurify` (+ `@types/dompurify`) is added as a dependency in the task that introduces it (Task 2).
- **Layering:** pure DI functions hold logic (take `$Fetch` / strings / `File`s); thin composables bind `$api`; components are thin over the composable. Component tests stay focused on the **invariant** (no `data:` URLs), the **alt-required gate**, and the **insert-snippet** — not exhaustive UI.
- **Out of scope here (deferred to Plan 4/5):** wiring `MediaPicker` into each content form's media fields (`splash`, `thumbnail`, app `image`, `mainfile`, `extrafile`, `datafile`) and wiring `ImageDropzone` / the upload handler into the editor layer's `uploadHandler` hook. Plan 3 delivers the tested blocks only.
- **Process:** TDD (red → green → refactor), frequent commits, pristine test output. Commit messages carry **no AI co-author trailer** (per project CLAUDE.md). Do not bump the pinned Pinia 2.x dependency stack.

## File structure

```
app/
├── lib/
│   ├── upload.ts             # DI: uploadFile / listMediaFiles / deleteMediaFile  (Strapi Upload API)
│   └── sanitize-svg.ts       # DI: isSvg(file) / sanitizeSvgText(svg)  (DOMPurify SVG profile)
└── components/
    ├── MediaPicker.vue       # upload-new + pick-existing; alt-required gate; emits a MediaRef
    └── ImageDropzone.vue     # drag-drop → eager-upload → thumbnail gallery → click-to-insert markdown

app/composables/
└── useUpload.ts              # binds $api → upload(file, info?) / browse(q?) / remove(id)

tests/
├── unit/
│   ├── upload.test.ts            # fake $Fetch: FormData (files + fileInfo), GET query, DELETE url, url-not-data:
│   └── sanitize-svg.test.ts      # (nuxt env) script/onload stripped; clean <svg><rect/></svg> survives
└── nuxt/
    ├── media-picker.test.ts      # mountSuspended; useUpload mocked; emitted src is a URL, never data:; alt gate
    └── image-dropzone.test.ts    # mountSuspended; drop → upload + thumbnail; click → ![alt](url "caption")
```

*(`sanitize-svg.test.ts` lives under `tests/unit/` but declares `// @vitest-environment nuxt` so DOMPurify has a DOM; the two component specs live under `tests/nuxt/` alongside the existing `login.test.ts` / `smoke.test.ts`.)*

---

### Task 1: Upload library (Strapi Upload API, pure DI)

**Files:**
- Create: `app/lib/upload.ts`
- Test: `tests/unit/upload.test.ts`

**Interfaces:**
- Consumes: `$Fetch` from `ofetch`; `MediaRef` from `~/types/content`; `mediaFromStrapi`, `StrapiMedia` from `~/lib/strapi-rest`.
- Produces:
  - `UploadInfo { alternativeText?: string; caption?: string; name?: string }`
  - `BrowseOptions { page?: number; pageSize?: number; search?: string }`
  - `uploadFile(api: $Fetch, file: File | Blob, info?: UploadInfo, filename?: string): Promise<MediaRef>` — builds `FormData` with `files` (+ optional `fileInfo` = `JSON.stringify(info)`), `POST /upload`, takes `[0]` of the returned array, maps via `mediaFromStrapi`.
  - `listMediaFiles(api: $Fetch, opts?: BrowseOptions): Promise<MediaRef[]>` — `GET /upload/files` with `pagination[page]` / `pagination[pageSize]` / `filters[name][$containsi]` / `sort=createdAt:DESC`; maps the plain array via `mediaFromStrapi`.
  - `deleteMediaFile(api: $Fetch, id: number): Promise<void>` — `DELETE /upload/files/:id`.

> **Upload-API notes (validated 2026-06-20):** the response to `POST /upload` is the file object(s) **directly** (an array, even for one file) — NOT a `{ data }` envelope and NOT the Content-Manager `{ results }` shape. `GET /upload/files` is likewise a **plain array**. `mediaFromStrapi` already produces a `MediaRef` whose `url` is the Media Library URL (never `data:`). When `info` is omitted, no `fileInfo` field is appended. `filename` is the multipart filename for a `Blob` that has no name (used by the SVG re-wrap path in Task 3); for a real `File`, pass its `.name`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/upload.test.ts
import { describe, it, expect, vi } from 'vitest'
import { uploadFile, listMediaFiles, deleteMediaFile } from '~/lib/upload'
import type { $Fetch } from 'ofetch'

// A raw uploaded-file object as returned directly by POST /upload (array) and GET /upload/files.
const rawFile = {
  id: 42,
  documentId: 'updoc42',
  name: 'figure.png',
  url: '/uploads/figure_abc123.png',
  mime: 'image/png',
  ext: '.png',
  size: 12.3,
  width: 800,
  height: 600,
  formats: { thumbnail: { url: '/uploads/thumbnail_figure_abc123.png' } },
  alternativeText: 'Bar chart of outcomes',
  caption: 'Figure 1.',
}

describe('uploadFile', () => {
  it('POSTs /upload with FormData carrying files + a fileInfo with alt/caption, and returns a url-based MediaRef', async () => {
    const api = vi.fn().mockResolvedValue([rawFile]) as unknown as $Fetch
    const file = new File(['x'], 'figure.png', { type: 'image/png' })

    const ref = await uploadFile(api, file, { alternativeText: 'Bar chart of outcomes', caption: 'Figure 1.' })

    // Endpoint + method.
    const [url, opts] = (api as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('/upload')
    expect(opts.method).toBe('POST')

    // Body is a FormData with `files` and a `fileInfo` JSON string holding alt + caption.
    const body = opts.body as FormData
    expect(body).toBeInstanceOf(FormData)
    expect(body.get('files')).toBeInstanceOf(File)
    const fileInfo = JSON.parse(body.get('fileInfo') as string)
    expect(fileInfo).toEqual({ alternativeText: 'Bar chart of outcomes', caption: 'Figure 1.' })

    // Returns a MediaRef whose src is a Media Library URL — never a data: URI.
    expect(ref.id).toBe(42)
    expect(ref.url).toBe('/uploads/figure_abc123.png')
    expect(ref.url.startsWith('data:')).toBe(false)
    expect(ref.alternativeText).toBe('Bar chart of outcomes')
    expect(ref.caption).toBe('Figure 1.')
  })

  it('omits fileInfo entirely when no info is supplied', async () => {
    const api = vi.fn().mockResolvedValue([rawFile]) as unknown as $Fetch
    await uploadFile(api, new File(['x'], 'figure.png', { type: 'image/png' }))
    const body = (api as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body as FormData
    expect(body.has('fileInfo')).toBe(false)
  })

  it('uses an explicit filename for a Blob (the SVG re-wrap path)', async () => {
    const api = vi.fn().mockResolvedValue([rawFile]) as unknown as $Fetch
    await uploadFile(api, new Blob(['<svg/>'], { type: 'image/svg+xml' }), undefined, 'drawing.svg')
    const body = (api as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body as FormData
    const sent = body.get('files') as File
    expect(sent.name).toBe('drawing.svg')
  })
})

describe('listMediaFiles', () => {
  it('GETs /upload/files with pagination, search filter, and DESC sort, mapping the plain array', async () => {
    const api = vi.fn().mockResolvedValue([rawFile]) as unknown as $Fetch
    const refs = await listMediaFiles(api, { page: 2, pageSize: 24, search: 'figure' })

    const [url, opts] = (api as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('/upload/files')
    expect(opts.query).toEqual({
      'pagination[page]': 2,
      'pagination[pageSize]': 24,
      'filters[name][$containsi]': 'figure',
      sort: 'createdAt:DESC',
    })
    expect(refs).toHaveLength(1)
    expect(refs[0].url).toBe('/uploads/figure_abc123.png')
    expect(refs[0].url.startsWith('data:')).toBe(false)
  })

  it('omits the name filter when no search term is given', async () => {
    const api = vi.fn().mockResolvedValue([]) as unknown as $Fetch
    await listMediaFiles(api)
    const opts = (api as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(opts.query['filters[name][$containsi]']).toBeUndefined()
    expect(opts.query.sort).toBe('createdAt:DESC')
  })
})

describe('deleteMediaFile', () => {
  it('DELETEs /upload/files/:id', async () => {
    const api = vi.fn().mockResolvedValue({}) as unknown as $Fetch
    await deleteMediaFile(api, 42)
    expect(api).toHaveBeenCalledWith('/upload/files/42', { method: 'DELETE' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/upload.test.ts`
Expected: FAIL — `Cannot find module '~/lib/upload'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/lib/upload.ts
// Strapi Upload API, pure DI (mirrors lib/repository.ts: $Fetch is injected as `api`).
// Validated against the live sandbox 2026-06-20:
//   - POST /upload (multipart FormData; field `files` + optional `fileInfo` JSON) → 201,
//     returns the file object(s) DIRECTLY as an ARRAY (take [0] for a single upload).
//     `fileInfo` = JSON.stringify({ alternativeText, caption, name? }) sets alt + caption at upload time.
//   - GET /upload/files → a PLAIN ARRAY of file objects (pagination[*], filters[name][$containsi], sort).
//   - DELETE /upload/files/:id → 200.
// Endpoints are /upload + /upload/files (NOT /api/upload). The returned file maps through
// mediaFromStrapi → MediaRef, whose `url` is a Media Library URL (NEVER a data: URI).
import type { $Fetch } from 'ofetch'
import type { MediaRef } from '~/types/content'
import { mediaFromStrapi, type StrapiMedia } from '~/lib/strapi-rest'

export interface UploadInfo {
  alternativeText?: string
  caption?: string
  name?: string
}

export interface BrowseOptions {
  page?: number
  pageSize?: number
  search?: string
}

/**
 * Upload one file/blob to the Media Library. Appends `files` and (when `info` is given)
 * a `fileInfo` JSON field that sets alt + caption at upload time. `filename` overrides the
 * multipart filename — needed when uploading a Blob (e.g. the sanitized-SVG re-wrap) that
 * carries no name. Returns a MediaRef (numeric id for writes + url for display).
 */
export async function uploadFile(
  api: $Fetch,
  file: File | Blob,
  info?: UploadInfo,
  filename?: string,
): Promise<MediaRef> {
  const form = new FormData()
  if (filename) form.append('files', file, filename)
  else form.append('files', file)
  if (info) form.append('fileInfo', JSON.stringify(info))

  const res = await api<StrapiMedia[]>('/upload', { method: 'POST', body: form })
  const ref = mediaFromStrapi(res[0])
  if (!ref) throw new Error('Upload succeeded but returned no file.')
  return ref
}

/** Browse the Media Library (paginated, optional name search, newest first). */
export async function listMediaFiles(api: $Fetch, opts: BrowseOptions = {}): Promise<MediaRef[]> {
  const res = await api<StrapiMedia[]>('/upload/files', {
    query: {
      'pagination[page]': opts.page,
      'pagination[pageSize]': opts.pageSize,
      'filters[name][$containsi]': opts.search,
      sort: 'createdAt:DESC',
    },
  })
  return res.map((m) => mediaFromStrapi(m)).filter((r): r is MediaRef => r !== null)
}

/** Remove a file from the Media Library by its numeric id. */
export async function deleteMediaFile(api: $Fetch, id: number): Promise<void> {
  await api(`/upload/files/${id}`, { method: 'DELETE' })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/upload.test.ts`
Expected: PASS (6 tests).

*Note: `ofetch` omits `query` keys whose value is `undefined`, so an unset `page`/`pageSize`/`search` produces a clean URL while `sort` always remains.*

- [ ] **Step 5: Commit**

```bash
git add app/lib/upload.ts tests/unit/upload.test.ts
git commit -m "feat(media): add Strapi Upload API library (upload/list/delete)"
```

---

### Task 2: SVG sanitizer (DOMPurify, SVG profile)

**Files:**
- Create: `app/lib/sanitize-svg.ts`
- Test: `tests/unit/sanitize-svg.test.ts`
- Dependency: add `dompurify` + `@types/dompurify`

**Interfaces:**
- Produces:
  - `isSvg(file: File | Blob): boolean` — true when the MIME type is `image/svg+xml`, or (for a `File`) the name ends in `.svg`.
  - `sanitizeSvgText(svg: string): string` — DOMPurify with the SVG profile; strips `<script>`, `on*` handlers, and external-entity / `xlink:href` references.

> **SVG safety (Global Constraints):** an SVG is the one upload format that can carry executable content, so it is scrubbed **client-side before upload**. DOMPurify needs a DOM, so this test declares `// @vitest-environment nuxt` (happy-dom). `USE_PROFILES: { svg: true, svgFilters: true }` keeps legitimate SVG markup (shapes, paths, filters) while removing scripting; `ADD_TAGS`/`ADD_ATTR` are NOT used (we never want to re-admit a risky tag). `xlink:href` is left out of the allowed attributes so external references are dropped.

- [ ] **Step 1: Add the dependency**

```bash
npm install dompurify
npm install -D @types/dompurify
```

Expected: `dompurify` appears under `dependencies` and `@types/dompurify` under `devDependencies` in `package.json`. (Do not touch the pinned Pinia 2.x stack.)

- [ ] **Step 2: Write the failing test**

```ts
// tests/unit/sanitize-svg.test.ts
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { isSvg, sanitizeSvgText } from '~/lib/sanitize-svg'

describe('isSvg', () => {
  it('detects an SVG by MIME type', () => {
    expect(isSvg(new Blob(['<svg/>'], { type: 'image/svg+xml' }))).toBe(true)
  })
  it('detects an SVG by .svg filename (case-insensitive), and rejects raster types', () => {
    expect(isSvg(new File(['<svg/>'], 'drawing.SVG', { type: '' }))).toBe(true)
    expect(isSvg(new File(['x'], 'photo.png', { type: 'image/png' }))).toBe(false)
  })
})

describe('sanitizeSvgText', () => {
  it('strips <script> and on* handlers from an SVG', () => {
    const dirty = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10" onload="evil()"/></svg>'
    const clean = sanitizeSvgText(dirty)
    expect(clean).not.toMatch(/<script/i)
    expect(clean).not.toMatch(/onload/i)
    expect(clean).not.toMatch(/alert\(1\)/)
  })
  it('drops external xlink:href references', () => {
    const dirty = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><image xlink:href="http://evil.example/x.svg"/></svg>'
    expect(sanitizeSvgText(dirty)).not.toMatch(/evil\.example/)
  })
  it('keeps a clean <svg><rect/></svg> intact', () => {
    const clean = sanitizeSvgText('<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>')
    expect(clean).toMatch(/<svg/i)
    expect(clean).toMatch(/<rect/i)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/unit/sanitize-svg.test.ts`
Expected: FAIL — `Cannot find module '~/lib/sanitize-svg'`.

- [ ] **Step 4: Write minimal implementation**

```ts
// app/lib/sanitize-svg.ts
// SVG is the one upload format that can carry executable content (scripts, on* handlers,
// external entity refs). It is sanitized CLIENT-SIDE with DOMPurify (SVG profile) BEFORE
// upload (design spec §7; Plan 3 Global Constraints). DOMPurify needs a DOM — callers run
// in the browser; tests use the nuxt/happy-dom env.
import DOMPurify from 'dompurify'

/** True when the file is an SVG by MIME type or (for a File) a .svg name. */
export function isSvg(file: File | Blob): boolean {
  if (file.type === 'image/svg+xml') return true
  const name = (file as File).name
  return typeof name === 'string' && name.toLowerCase().endsWith('.svg')
}

/**
 * Sanitize SVG source with the SVG profile: strips <script>, on* handlers, and external
 * entity / xlink:href references. No ADD_TAGS/ADD_ATTR — we never re-admit a risky tag.
 */
export function sanitizeSvgText(svg: string): string {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
  })
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/sanitize-svg.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add app/lib/sanitize-svg.ts tests/unit/sanitize-svg.test.ts package.json package-lock.json
git commit -m "feat(media): add client-side SVG sanitizer (DOMPurify SVG profile)"
```

---

### Task 3: `useUpload` composable (binds `$api`; orchestrates reject + sanitize + upload)

**Files:**
- Create: `app/composables/useUpload.ts`
- Test: `tests/unit/upload-orchestration.test.ts`

**Interfaces:**
- Consumes: `useNuxtApp().$api`; `uploadFile`, `listMediaFiles`, `deleteMediaFile`, `UploadInfo`, `BrowseOptions` from `~/lib/upload`; `isSvg`, `sanitizeSvgText` from `~/lib/sanitize-svg`; `hasAllowedImageExtension` from `~/lib/image-types`; `MediaRef` from `~/types/content`.
- Produces: `useUpload()` returning
  - `upload(file: File, info?: UploadInfo): Promise<MediaRef>` — rejects if `!hasAllowedImageExtension(file.name)`; if `isSvg(file)`, reads its text → `sanitizeSvgText` → re-wraps as an `image/svg+xml` `Blob` (passing the original filename through to `uploadFile`); otherwise uploads the file as-is.
  - `browse(search?: string): Promise<MediaRef[]>` — thin pass-through to `listMediaFiles`.
  - `remove(id: number): Promise<void>` — thin pass-through to `deleteMediaFile`.
- Also export the pure orchestrator `prepareUpload(file: File): Promise<File | Blob>` (extension-gate + SVG-sanitize) so the gate/sanitize path is unit-testable **without** a Nuxt mount; `upload` is `prepareUpload` + `uploadFile($api, …)`.

> **Mirror `useAuth`:** the composable is one-line wiring (`const { $api } = useNuxtApp()`), delegating to the already-tested pure libs. The only *new* logic is `prepareUpload` (gate + sanitize-before-upload), so that is extracted as a pure function and tested directly here; the full `upload(...$api...)` path is additionally exercised by the Task 4/5 component tests. (Extracting `prepareUpload` keeps the orchestration testable in the fast node env, matching the data layer's "logic lives in pure functions" rule.)

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/upload-orchestration.test.ts
import { describe, it, expect } from 'vitest'
import { prepareUpload } from '~/composables/useUpload'

describe('prepareUpload (extension gate + SVG sanitize, pre-upload)', () => {
  it('rejects a disallowed extension with a clear message', async () => {
    await expect(prepareUpload(new File(['x'], 'photo.gif', { type: 'image/gif' })))
      .rejects.toThrow(/jpg|jpeg|png|svg/i)
  })

  it('passes an allowed raster file through unchanged', async () => {
    const png = new File(['x'], 'figure.png', { type: 'image/png' })
    expect(await prepareUpload(png)).toBe(png)
  })

  it('sanitizes an SVG before upload, returning a cleaned image/svg+xml Blob', async () => {
    const dirty = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10"/></svg>'
    const out = await prepareUpload(new File([dirty], 'drawing.svg', { type: 'image/svg+xml' }))
    expect(out).not.toBe(undefined)
    expect(out.type).toBe('image/svg+xml')
    const text = await (out as Blob).text()
    expect(text).not.toMatch(/<script/i)
    expect(text).toMatch(/<rect/i)
  })
})
```

*(This spec exercises only the pure `prepareUpload`; it needs the same DOM that Task 2 uses for DOMPurify, so it also declares the nuxt env — see Step 3. The `upload()/browse()/remove()` wiring over `$api` is covered by the component tests in Tasks 4–5.)*

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/upload-orchestration.test.ts`
Expected: FAIL — `prepareUpload` not exported from `~/composables/useUpload`.

- [ ] **Step 3: Add the nuxt env directive to the test**

Prepend the env directive (DOMPurify, via `sanitizeSvgText`, needs a DOM) so the SVG case runs:

```ts
// tests/unit/upload-orchestration.test.ts  (first line)
// @vitest-environment nuxt
```

- [ ] **Step 4: Write minimal implementation**

```ts
// app/composables/useUpload.ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/upload-orchestration.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add app/composables/useUpload.ts tests/unit/upload-orchestration.test.ts
git commit -m "feat(media): add useUpload composable (gate + sanitize + eager upload)"
```

---

### Task 4: `MediaPicker` component (upload-new + pick-existing, alt-required)

**Files:**
- Create: `app/components/MediaPicker.vue`
- Test: `tests/nuxt/media-picker.test.ts`

**Interfaces:**
- Consumes: `useUpload()` (`upload`, `browse`); `MediaRef` from `~/types/content`; Nuxt UI primitives.
- Props: `mode?: 'upload' | 'browse'` (default `'upload'`).
- Emits: `select` with the chosen `MediaRef` (its `url` is always a Media Library URL).
- Behaviour:
  - **Upload-new:** a file input + a drop area; the user must enter **alt-text** (caption optional) and the **upload button is disabled until alt-text is non-empty**. On upload, calls `useUpload().upload(file, { alternativeText, caption })`, then emits `select` with the returned `MediaRef`.
  - **Pick-existing:** a grid populated from `useUpload().browse()`; selecting a tile emits `select` with that `MediaRef`.
  - The preview/grid **always** renders from `ref.url` — never from a client-side `data:` / object-URL blob.

> **Component-test ergonomics (spec §13):** run under the Nuxt runtime env (`// @vitest-environment nuxt`) with `mountSuspended`, mocking `useUpload` via `mockNuxtImport` so no network is hit (same pattern as `tests/nuxt/login.test.ts`). The mock returns a **`url`-based** `MediaRef`. Assertions stay focused on the **invariant** (emitted `url` is a Media Library URL, never `data:`), the **alt-required gate**, and that `select` fires — not exhaustive UI. The file `accept` filter reuses `ALLOWED_IMAGE_EXTENSIONS` (the data-layer allowlist) so valid types are not over-rejected.

- [ ] **Step 1: Write the failing test**

```ts
// tests/nuxt/media-picker.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { MediaRef } from '~/types/content'

const uploaded: MediaRef = {
  id: 42, url: '/uploads/figure_abc123.png', name: 'figure.png',
  alternativeText: 'Bar chart', caption: null, width: 800, height: 600, mime: 'image/png',
}
const uploadMock = vi.fn().mockResolvedValue(uploaded)
const browseMock = vi.fn().mockResolvedValue([uploaded])

mockNuxtImport('useUpload', () => () => ({
  upload: uploadMock,
  browse: browseMock,
  remove: vi.fn(),
}))

import MediaPicker from '~/components/MediaPicker.vue'

describe('MediaPicker', () => {
  beforeEach(() => {
    uploadMock.mockClear()
    browseMock.mockClear()
  })

  it('blocks upload until alt-text is provided', async () => {
    const wrapper = await mountSuspended(MediaPicker)
    const file = new File(['x'], 'figure.png', { type: 'image/png' })

    // Provide a file but NO alt-text → upload is gated.
    await wrapper.vm.$.exposed!.setFile(file)
    await wrapper.vm.$.exposed!.submit()
    expect(uploadMock).not.toHaveBeenCalled()

    // Now add alt-text → upload proceeds.
    await wrapper.vm.$.exposed!.setAlt('Bar chart')
    await wrapper.vm.$.exposed!.submit()
    expect(uploadMock).toHaveBeenCalledWith(file, expect.objectContaining({ alternativeText: 'Bar chart' }))
  })

  it('emits select with a Media-Library URL MediaRef — never a data: URI', async () => {
    const wrapper = await mountSuspended(MediaPicker)
    const file = new File(['x'], 'figure.png', { type: 'image/png' })
    await wrapper.vm.$.exposed!.setFile(file)
    await wrapper.vm.$.exposed!.setAlt('Bar chart')
    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))

    const events = wrapper.emitted('select')
    expect(events).toBeTruthy()
    const ref = events![0][0] as MediaRef
    expect(ref.url).toBe('/uploads/figure_abc123.png')
    expect(ref.url.startsWith('data:')).toBe(false)
  })

  it('in browse mode, selecting a tile emits its (url-based) MediaRef', async () => {
    const wrapper = await mountSuspended(MediaPicker, { props: { mode: 'browse' } })
    await new Promise((r) => setTimeout(r, 0))
    expect(browseMock).toHaveBeenCalled()
    await wrapper.vm.$.exposed!.choose(uploaded)
    const ref = wrapper.emitted('select')![0][0] as MediaRef
    expect(ref.url.startsWith('data:')).toBe(false)
    expect(ref.id).toBe(42)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/nuxt/media-picker.test.ts`
Expected: FAIL — `Cannot find module '~/components/MediaPicker.vue'`.

- [ ] **Step 3: Write minimal implementation**

```vue
<!-- app/components/MediaPicker.vue -->
<!--
  MediaPicker: upload-new OR pick-existing, backing every media field. Eager-upload yields a
  Media Library reference whose `url` is shown in the preview — NEVER a client-side data: /
  object-URL blob (the zero-base64 invariant, design spec §7/§13). Alt-text is REQUIRED before
  an upload completes; caption is optional. Both flow to Strapi via useUpload().upload's fileInfo.
  The selected MediaRef is emitted via `select`. Form wiring into content fields is Plan 4/5.
-->
<script setup lang="ts">
import { ALLOWED_IMAGE_EXTENSIONS } from '~/lib/image-types'
import type { MediaRef } from '~/types/content'

const props = withDefaults(defineProps<{ mode?: 'upload' | 'browse' }>(), { mode: 'upload' })
const emit = defineEmits<{ select: [ref: MediaRef] }>()

const { upload, browse } = useUpload()

// Accept filter shares the data-layer allowlist (no over-rejection of valid types).
const accept = ALLOWED_IMAGE_EXTENSIONS.map((e) => `.${e}`).join(',')

// --- upload-new state ---
const file = ref<File | null>(null)
const alt = ref('')
const caption = ref('')
const busy = ref(false)
const error = ref<string | null>(null)

const canSubmit = computed(() => !!file.value && alt.value.trim().length > 0 && !busy.value)

function setFile(f: File | null) { file.value = f; error.value = null }
function setAlt(v: string) { alt.value = v }
function setCaption(v: string) { caption.value = v }

function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  setFile(input.files?.[0] ?? null)
}
function onDrop(e: DragEvent) {
  e.preventDefault()
  setFile(e.dataTransfer?.files?.[0] ?? null)
}

async function submit() {
  if (!canSubmit.value || !file.value) return // alt-required gate
  busy.value = true
  error.value = null
  try {
    const ref = await upload(file.value, {
      alternativeText: alt.value.trim(),
      caption: caption.value.trim() || undefined,
    })
    emit('select', ref)
    file.value = null
    alt.value = ''
    caption.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Upload failed.'
  } finally {
    busy.value = false
  }
}

// --- pick-existing state ---
const items = ref<MediaRef[]>([])

async function loadLibrary() { items.value = await browse() }
function choose(ref: MediaRef) { emit('select', ref) }

onMounted(() => { if (props.mode === 'browse') loadLibrary() })

// Exposed for component tests (and for parent-driven control in later plans).
defineExpose({ setFile, setAlt, setCaption, submit, choose, canSubmit })
</script>

<template>
  <div class="media-picker">
    <!-- Upload-new -->
    <div v-if="mode === 'upload'">
      <div
        class="dropzone"
        @dragover.prevent
        @drop="onDrop"
      >
        <input type="file" :accept="accept" @change="onFileInput">
        <p v-if="file">{{ file.name }}</p>
        <p v-else>Drag an image here, or choose a file.</p>
      </div>

      <label>
        Alt text (required)
        <input :value="alt" type="text" @input="setAlt(($event.target as HTMLInputElement).value)">
      </label>
      <label>
        Caption (optional)
        <input :value="caption" type="text" @input="setCaption(($event.target as HTMLInputElement).value)">
      </label>

      <p v-if="error" role="alert">{{ error }}</p>
      <UButton :disabled="!canSubmit" @click="submit">Upload</UButton>
    </div>

    <!-- Pick-existing -->
    <div v-else class="grid">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        @click="choose(item)"
      >
        <img :src="item.url" :alt="item.alternativeText ?? ''" width="120">
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/nuxt/media-picker.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/components/MediaPicker.vue tests/nuxt/media-picker.test.ts
git commit -m "feat(media): add MediaPicker (upload-new + pick-existing, alt-required)"
```

---

### Task 5: `ImageDropzone` + click-to-insert

**Files:**
- Create: `app/components/ImageDropzone.vue`
- Test: `tests/nuxt/image-dropzone.test.ts`

**Interfaces:**
- Consumes: `useUpload()` (`upload`); `MediaRef` from `~/types/content`; Nuxt UI primitives.
- Emits: `insert` with the markdown snippet string `![<alt>](<url> "<caption>")` (the caption-title segment omitted when there is no caption).
- Behaviour:
  - Drag-and-drop one or more images → **eager-upload each** via `useUpload().upload` (gate + SVG-sanitize handled inside `upload`).
  - Render the uploaded images as a **thumbnail gallery** from each `ref.url`.
  - **Clicking a thumbnail emits `insert`** with `![alt](url "caption")` for that image (URL, never base64).

> **Inline-figure flow (design spec §7.3):** this is the author's primary "add a picture to the body" affordance — drop → upload → click-to-insert at the cursor. The markdown snippet uses the Media Library `url`. The component test drops a file, asserts an upload happened and a thumbnail rendered (from a `url`, not `data:`), then asserts the click emits the `![alt](url …)` string. The snippet builder is a tiny pure helper (`toMarkdown(ref)`) exported for a direct unit assertion of the caption/no-caption shapes.

- [ ] **Step 1: Write the failing test**

```ts
// tests/nuxt/image-dropzone.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { MediaRef } from '~/types/content'
import { toMarkdown } from '~/components/image-markdown'

const uploaded: MediaRef = {
  id: 7, url: '/uploads/chart_xyz.png', name: 'chart.png',
  alternativeText: 'Outcome chart', caption: 'Figure 2.', width: 640, height: 480, mime: 'image/png',
}
const uploadMock = vi.fn().mockResolvedValue(uploaded)

mockNuxtImport('useUpload', () => () => ({
  upload: uploadMock,
  browse: vi.fn().mockResolvedValue([]),
  remove: vi.fn(),
}))

import ImageDropzone from '~/components/ImageDropzone.vue'

describe('toMarkdown', () => {
  it('builds ![alt](url "caption") with a caption', () => {
    expect(toMarkdown(uploaded)).toBe('![Outcome chart](/uploads/chart_xyz.png "Figure 2.")')
  })
  it('omits the title segment when there is no caption', () => {
    expect(toMarkdown({ ...uploaded, caption: null })).toBe('![Outcome chart](/uploads/chart_xyz.png)')
  })
})

describe('ImageDropzone', () => {
  beforeEach(() => uploadMock.mockClear())

  it('eager-uploads a dropped file and renders a thumbnail from its url (not base64)', async () => {
    const wrapper = await mountSuspended(ImageDropzone)
    const file = new File(['x'], 'chart.png', { type: 'image/png' })
    await wrapper.vm.$.exposed!.handleFiles([file])
    await new Promise((r) => setTimeout(r, 0))

    expect(uploadMock).toHaveBeenCalledWith(file)
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('/uploads/chart_xyz.png')
    expect(img.attributes('src')!.startsWith('data:')).toBe(false)
  })

  it('clicking a thumbnail emits insert with the ![alt](url "caption") snippet', async () => {
    const wrapper = await mountSuspended(ImageDropzone)
    await wrapper.vm.$.exposed!.handleFiles([new File(['x'], 'chart.png', { type: 'image/png' })])
    await new Promise((r) => setTimeout(r, 0))

    await wrapper.find('button.thumb').trigger('click')
    const snippet = wrapper.emitted('insert')![0][0] as string
    expect(snippet).toBe('![Outcome chart](/uploads/chart_xyz.png "Figure 2.")')
    expect(snippet).not.toMatch(/data:/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/nuxt/image-dropzone.test.ts`
Expected: FAIL — `Cannot find module '~/components/image-markdown'` / `~/components/ImageDropzone.vue`.

- [ ] **Step 3: Write the pure snippet helper**

```ts
// app/components/image-markdown.ts
// Build the inline-figure markdown snippet from a Media Library reference (design spec §7.3).
// The `src` is ALWAYS a Media Library url — never base64. Caption becomes the optional title.
import type { MediaRef } from '~/types/content'

export function toMarkdown(ref: MediaRef): string {
  const alt = ref.alternativeText ?? ''
  const caption = ref.caption?.trim()
  return caption
    ? `![${alt}](${ref.url} "${caption}")`
    : `![${alt}](${ref.url})`
}
```

- [ ] **Step 4: Write the component**

```vue
<!-- app/components/ImageDropzone.vue -->
<!--
  ImageDropzone: the author's inline-figure flow (design spec §7.3). Drag-and-drop one or more
  images → eager-upload EACH via useUpload().upload (extension-gate + SVG-sanitize happen inside)
  → render a clickable thumbnail gallery from each url → clicking a thumbnail emits `insert` with
  the markdown snippet ![alt](url "caption"). Every src/snippet is a Media Library URL — NEVER
  base64. Wiring this into the editor's uploadHandler is deferred to Plan 4/5.
-->
<script setup lang="ts">
import { ALLOWED_IMAGE_EXTENSIONS } from '~/lib/image-types'
import type { MediaRef } from '~/types/content'
import { toMarkdown } from '~/components/image-markdown'

const emit = defineEmits<{ insert: [snippet: string] }>()
const { upload } = useUpload()

const accept = ALLOWED_IMAGE_EXTENSIONS.map((e) => `.${e}`).join(',')
const gallery = ref<MediaRef[]>([])
const errors = ref<string[]>([])

/** Eager-upload each dropped/selected file; collect the resulting MediaRefs into the gallery. */
async function handleFiles(files: File[] | FileList) {
  for (const file of Array.from(files)) {
    try {
      const ref = await upload(file)
      gallery.value.push(ref)
    } catch (e) {
      errors.value.push(`${file.name}: ${e instanceof Error ? e.message : 'upload failed'}`)
    }
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files)
}
function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) handleFiles(input.files)
}

/** Click-to-insert: emit the markdown snippet for this image (URL, never base64). */
function insert(ref: MediaRef) { emit('insert', toMarkdown(ref)) }

defineExpose({ handleFiles, insert, gallery })
</script>

<template>
  <div class="image-dropzone">
    <div class="dropzone" @dragover.prevent @drop="onDrop">
      <input type="file" :accept="accept" multiple @change="onFileInput">
      <p>Drag images here, or choose files. Click a thumbnail to insert it.</p>
    </div>

    <ul v-if="errors.length" class="errors" role="alert">
      <li v-for="(msg, i) in errors" :key="i">{{ msg }}</li>
    </ul>

    <div class="grid">
      <button
        v-for="item in gallery"
        :key="item.id"
        type="button"
        class="thumb"
        :title="`Insert ${item.alternativeText ?? item.name ?? 'image'}`"
        @click="insert(item)"
      >
        <img :src="item.url" :alt="item.alternativeText ?? ''" width="120">
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/nuxt/image-dropzone.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add app/components/ImageDropzone.vue app/components/image-markdown.ts tests/nuxt/image-dropzone.test.ts
git commit -m "feat(media): add ImageDropzone with eager upload + click-to-insert"
```

---

### Task 6: Zero-base64 reinforcement guard (cross-cutting test)

**Files:**
- Test: `tests/unit/media-zero-base64.test.ts`

**Interfaces:**
- Consumes: `uploadFile`, `listMediaFiles` from `~/lib/upload`; `toMarkdown` from `~/components/image-markdown`; `MediaRef` from `~/types/content`; the existing `containsBase64` from `~/lib/base64-guard` (the data layer's guard) as the assertion oracle.

> **The headline invariant, made explicit.** Tasks 1, 4, and 5 each assert "no `data:` URL" at their own boundary; this task is a single focused guard that asserts the **whole media layer** funnels only Media Library URLs into the values that reach state/markdown — reusing the data layer's `containsBase64` as the oracle (the same predicate that gates content writes). No new production code; it documents and locks the invariant in one place. (Per the task brief, this can be folded into the component tests if cleaner — kept separate here so the invariant has one named home.)

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/media-zero-base64.test.ts
import { describe, it, expect, vi } from 'vitest'
import { uploadFile, listMediaFiles } from '~/lib/upload'
import { toMarkdown } from '~/components/image-markdown'
import { containsBase64 } from '~/lib/base64-guard'
import type { $Fetch } from 'ofetch'

const rawFile = {
  id: 1, documentId: 'd', name: 'a.png', url: '/uploads/a_123.png', mime: 'image/png',
  alternativeText: 'Alt', caption: 'Cap',
}

describe('media layer never yields base64 into state/markdown', () => {
  it('uploadFile produces a MediaRef the base64 guard accepts (url, not data:)', async () => {
    const api = vi.fn().mockResolvedValue([rawFile]) as unknown as $Fetch
    const ref = await uploadFile(api, new File(['x'], 'a.png', { type: 'image/png' }))
    expect(containsBase64(ref)).toBe(false)
    expect(ref.url.startsWith('data:')).toBe(false)
  })

  it('listMediaFiles produces only url-based refs', async () => {
    const api = vi.fn().mockResolvedValue([rawFile, { ...rawFile, id: 2, url: '/uploads/b_456.png' }]) as unknown as $Fetch
    const refs = await listMediaFiles(api)
    expect(containsBase64(refs)).toBe(false)
  })

  it('the inserted markdown snippet carries a url, never base64', async () => {
    const api = vi.fn().mockResolvedValue([rawFile]) as unknown as $Fetch
    const ref = await uploadFile(api, new File(['x'], 'a.png', { type: 'image/png' }))
    const snippet = toMarkdown(ref)
    expect(snippet).toMatch(/\/uploads\//)
    expect(containsBase64(snippet)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/media-zero-base64.test.ts`
Expected: FAIL — the imports resolve, but run BEFORE Tasks 1/5 land and it fails on the missing modules; after they land, it must PASS (it asserts the already-correct behaviour). If implemented last, confirm it passes immediately and treat any failure as a real regression.

- [ ] **Step 3: (no new production code)**

This guard asserts behaviour already implemented in Tasks 1 and 5. If it fails, the failure is a genuine zero-base64 regression in `upload.ts` / `image-markdown.ts` — fix the source, never weaken the test.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/media-zero-base64.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full suite + typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: all tests pass (the prior plans' baseline + this plan's additions); typecheck exit 0.

- [ ] **Step 6: Commit**

```bash
git add tests/unit/media-zero-base64.test.ts
git commit -m "test(media): lock the zero-base64 invariant across the media layer"
```

---

## Post-plan verification (user-gated)

These require a real admin-panel login (the Upload API rejects unauthenticated calls) and a real browser, so they run as a controlled manual check after the plan lands — they do **not** block merge:

1. **Live upload smoke (dev instance):** with the dev server running, signed in as a Strapi admin user, drop a small PNG into the `ImageDropzone` (or `MediaPicker`); confirm a `201` to `/upload`, a thumbnail rendered from the returned `url`, and that the network payload is multipart (a `files` part) — **never** a base64 `data:` body. **Target the dev Strapi 5 only.**
2. **Alt/caption-at-upload:** upload with alt-text + caption set; confirm the returned file object carries `alternativeText`/`caption` (set via `fileInfo`) and that the emitted `MediaRef` reflects them.
3. **Browse + delete:** in `MediaPicker` browse mode, confirm `GET /upload/files` lists the library (search/paginate), selecting reuses a file's existing `id`/`url`, and a throwaway uploaded file can be removed via `DELETE /upload/files/:id`.
4. **SVG safety end-to-end:** upload an SVG containing a `<script>` and an `onload`; confirm the uploaded file's source has them stripped (sanitized client-side before the POST).
5. **Zero-base64 end-to-end:** confirm no upload path ever assigns a `data:` URI to a preview or to emitted/persisted state; clicking a thumbnail inserts `![alt](url "caption")` with a Media Library URL.

## Open items carried into later plans

- **Editor `uploadHandler` integration** — wire `ImageDropzone` / the eager-upload handler into the ICJIA Markdown Editor layer's `uploadHandler` hook so click-to-insert lands at the cursor (Plan 4/5).
- **Content-form media fields** — back `splash`, `thumbnail`, app `image`, `mainfile`, `extrafile`, `datafile` with `MediaPicker`, feeding each field's numeric `id` to the data layer's `*ToWrite` mappers (Plan 4/5).
- **`images` JSON sync** — on insert, also append `{ title, src: url }` to the article `images` array for public-site parity (design spec §7.3); belongs with the article form (Plan 5).
- **Per-field constraints** — accepted types / max sizes per media field (design spec §7.2, open item §14 #9) carried as `MediaPicker` props when forms need them (Plan 5).
- **Non-image binaries** — `mainfile` (pdf), `extrafile` (any), `datafile` (csv) reuse `uploadFile` but bypass the image extension-gate; add a typed variant when those fields are wired (Plan 5).
- **`thumbnail` derivation** — prefer deriving from `splash`'s Strapi `formats` over a distinct upload (design spec §14 #5); decided when the article form lands.

## Self-review (performed against the design spec)

- **Spec coverage:** **§7 image/file handling** → eager-upload pattern (`uploadFile` Task 1; `useUpload().upload` Task 3; previews always from `url`), `MediaPicker` upload-new + pick-existing (Task 4), inline-figure dropzone + click-to-insert `![alt](url)` (Task 5), allowed-type accept-filter reusing `ALLOWED_IMAGE_EXTENSIONS` (Tasks 4/5), SVG sanitize-before-upload (Task 2) — the one safety step §7 added mid-build. **§13 testing** → "component tests for `MediaPicker` asserting **no `data:` URLs** ever enter state" is Task 4 (plus the cross-cutting guard, Task 6); upload/sanitize unit tests (Tasks 1–3); all tests mock the network (fake `$Fetch` / `mockNuxtImport`), per "no network in tests." Editor/form INTEGRATION is correctly **deferred to Plan 4/5** (Open items) — Plan 3 ships the tested blocks.
- **Validated-mechanics fidelity:** `/upload` (FormData `files` + `fileInfo` JSON; 201 → array, take `[0]`), `/upload/files` (plain array; `pagination[*]` / `filters[name][$containsi]` / `sort=createdAt:DESC`), `DELETE /upload/files/:id`, endpoints **not** `/api/upload`, admin JWT via `$api` — all used verbatim from Global Constraints (Tasks 1/3).
- **Reuse, not recreate:** `mediaFromStrapi` (Task 1), `MediaRef` (every task), `ALLOWED_IMAGE_EXTENSIONS` / `hasAllowedImageExtension` (Tasks 3/4/5), `containsBase64` (Task 6), and the `useAuth`-shaped thin composable (Task 3) are consumed from existing modules — none are redefined.
- **Placeholder scan:** none — every step ships complete code (no TODOs, no "similar to Task N") and exact run/commit commands.
- **Type/name consistency:** `MediaRef`, `UploadInfo`, `BrowseOptions`, `uploadFile`, `listMediaFiles`, `deleteMediaFile`, `prepareUpload`, `useUpload` (`upload`/`browse`/`remove`), `MediaPicker` (emits `select`), `ImageDropzone` (emits `insert`), and `toMarkdown` are spelled identically across Tasks 1→6; `useUpload().upload` consumes `UploadInfo` exactly as `MediaPicker` supplies `{ alternativeText, caption }`; the SVG re-wrap passes `file.name` through `uploadFile`'s `filename` param; the `$api` is the configured `$Fetch` (admin JWT + base URL) from `app/plugins/api.ts`, injected by DI everywhere.

---

**Plan complete.** Six TDD tasks producing a tested media layer — a DI Strapi-Upload library, a DOMPurify SVG sanitizer, a thin `useUpload` composable, and the `MediaPicker` + `ImageDropzone` components — with the **zero-base64 / no-`data:`-URL** invariant enforced by unit *and* component tests. The numeric file `id` minted here feeds the data layer's write mappers; the editor/forms integration that consumes these blocks is deferred to Plan 4/5.
