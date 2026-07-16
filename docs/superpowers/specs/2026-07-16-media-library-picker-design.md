# Media-library picker with demo parity — design

**Date:** 2026-07-16 · **Status:** Approved (design reviewed in-session) · **Owner:** cschweda

Authors' article images often already exist in the Strapi Media Library. Today every image
surface in the Studio is upload-only, so authors re-upload duplicates and never see what the
library already holds. This design adds a **library-first image picker**: every image surface
shows the ~20 most recent Media Library images (with search over the whole library), and
"upload from desktop" becomes the second path instead of the only one. It works identically
in the public demo — the sole difference is that demo images are session-only and never
persist (the demo's don't-touch-Strapi contract).

It also closes a latent quirk found during design: alt/caption edits made after upload are
silently discarded on save, because no update-file-info call exists. This work adds that call
and wires the existing `MediaField` alt/caption editing to it.

## 1. Scope

**In scope**

- A `MediaLibrary` adapter seam (Strapi + in-memory demo implementations) selected by
  `isDemoData()` — the same pattern as the annotations `AnnotationStore`.
- A shared `MediaLibraryGrid.vue` (search, thumbnails, Load more) used by:
  - `MediaPicker.vue` — gains **[Library | Upload]** tabs for `kind="image"`; Library is the
    default tab. The Upload tab is today's flow, unchanged.
  - `BodyImagesField.vue` — gains **Add from library**; picked images join the tray.
- Alt policy for library picks: an image **with** alt is used as-is; an image **without** alt
  requires the author to supply alt before the pick completes, and the supplied alt is
  **written back** to the media record (`updateFileInfo`) so the shared library improves.
  In demo-data sessions the write-back is in-memory.
- Fix the alt-persistence quirk: `MediaField`'s selected-state alt/caption edits persist via
  `updateFileInfo` on commit (blur), instead of being dropped on save.
- Demo parity: the demo library is seeded from the 24 bundled assets (16 photos + 8 figures);
  demo "uploads" add session-only entries rendered from `blob:` object URLs. Demo CSP
  `img-src` gains `blob:`.
- The demo-only "Load sample figures" button in `BodyImagesField` is **removed** — superseded
  by Add-from-library (the demo library contains those same figures).

**Out of scope (v1)**

- Document/PDF pickers (`kind="file"`, `MainFilesField`, extrafile, datafile) stay
  upload-only. Images are the priority; files can follow the same seam later.
- No deleting or renaming library images from the picker (the `remove()` API exists but
  stays unwired).
- No image cropping, focal points, or format variants.
- No overwriting of *existing* alt text from the pick flow (only filling missing alt).
  `MediaField` editing of an already-selected image's alt is the deliberate exception —
  that is an explicit author action on a chosen image.
- The July 8 "body-images panel redesign" (panel lists all images already in the body)
  remains a separate deferred item.
- The editor's inline paste/drop image pipeline (`editor/image-insert.ts`) keeps its
  current behavior (live upload; inert in demo). Demo desktop-adds happen through the
  picker surfaces; routing the inline pipeline through the new seam can follow later.

## 2. Decisions and rationale

| Decision | Choice | Why |
|---|---|---|
| Picker layout | Tabs **[Library \| Upload]**, Library default | Library-first matches the "images may already exist" reality; tabs stay compact in the narrow body-images sidebar; the Upload tab preserves the audited upload flow untouched. |
| Demo/live seam | `MediaLibrary` interface + two adapters, chosen by `isDemoData()` | Mirrors the proven `AnnotationStore` pattern the audits credited; pure-TS adapters are unit-testable without a browser; demo logic stays out of components. |
| Alt on library picks | Require when missing; write back to the record | "Alt required on every image" is the spec's accessibility floor. Write-back fixes the library for every future use instead of patching one article. Existing alt is never silently overwritten. |
| Session-image ids | **All** demo-library entries use negative ids (seeded −1…−24, session adds continue down) | `mediaIdForWrite` drops refs with id ≤ 0, so a demo/session image can *structurally* never reach a Strapi write — defense-in-depth consistent with the sample-content convention. Demo saves keep the full `MediaRef` (the in-memory repo stores domain objects), so images survive demo saves. |
| Demo upload rendering | `blob:` object URLs, `img-src` gains `blob:` in the **demo** header set only | Session images need a displayable URL without any network or base64. Production CSP is untouched — live never renders blob:. The security-headers guard test is updated deliberately, not weakened. |
| Page size / search | 20 newest first; Load more pages by 20; search is server-side over the whole library (`filters[name][$containsi]`) | "Last 20 or so" per the product ask; `listMediaFiles` already supports exactly this. The demo adapter implements the same contract in-memory. |
| Upload gate parity | `prepareUpload` (extension allow-list + SVG sanitize) runs in front of **both** adapters | Demo behavior must match live behavior — a file rejected in production is rejected in the demo too, and a sanitized SVG is sanitized in both. |
| Belt-and-suspenders | Strapi adapter's write paths keep an `isDemoMode()` throw | Preserves the audited hard-block; the demo adapter is the only writer in demo, and it never networks. |

## 3. Architecture

### 3.1 New pure lib — `app/lib/media-library.ts`

```ts
export interface MediaLibraryListOptions { page?: number; pageSize?: number; search?: string }

export interface MediaLibrary {
  /** Newest-first page of library images. */
  list(opts?: MediaLibraryListOptions): Promise<MediaRef[]>
  /** Upload one prepared (gated/sanitized) image; returns its library ref. */
  upload(file: File | Blob, info?: UploadInfo, filename?: string): Promise<MediaRef>
  /** Update alt/caption on an existing library record; returns the updated ref. */
  updateInfo(id: number, info: UploadInfo): Promise<MediaRef>
}

export function createStrapiMediaLibrary(api: $Fetch): MediaLibrary
```

The Strapi adapter delegates to the existing `listMediaFiles` / `uploadFile` plus a **new**
`updateFileInfo(api, id, info)` in `app/lib/upload.ts`. Strapi 5's upload plugin updates
file info via `POST /upload?id=<id>` with a `fileInfo` JSON part; **verify the exact request
shape against the live sandbox during implementation** and record it in the file header,
exactly as the existing endpoints were validated on 2026-06-20. Both write functions keep
the `isDemoMode()` hard-throw.

### 3.2 Demo adapter — `app/lib/demo-media-library.ts`

Module-level in-memory list, same lifetime contract as `demo-repository.ts` (shared for the
session, reset on full reload, never mutates its seed):

- **Seed:** the 16 bundled photos (`sample-images.ts` pool) + the 8 bundled figures
  (`sample-figures.ts`), as `MediaRef`s with negative ids (−1…−24), deterministic names
  derived from their filenames, alt text derived from the humanized filename, and
  deterministic pseudo-dates so "newest first" is stable. No `Math.random`, no
  `Date.now()` (fixed base date).
- **`list`:** name-contains search (case-insensitive) + paging over the in-memory array.
- **`upload`:** prepends `{ id: nextNegativeId, url: createObjectUrl(file), name,
  alternativeText, caption }`. `createObjectUrl` is injectable (defaults to
  `URL.createObjectURL`) so unit tests run without a browser.
- **`updateInfo`:** mutates the in-memory entry.
- Never touches `$api`; never persists.

### 3.3 Composable — `app/composables/useMediaLibrary.ts`

```ts
export function useMediaLibrary(): {
  list; uploadImage; updateInfo   // uploadImage = prepareUpload gate + adapter.upload
}
```

Returns the demo adapter when `isDemoData()` (public demo build **and** the local
`admin`/`admin` dev session — both already run on in-memory content, and a sentinel JWT
could not upload anyway), else the Strapi adapter bound to `$api`. The extension gate + SVG
sanitization (`prepareUpload`) is applied in this layer so both adapters receive only
gated, sanitized files.

**Callers:** the three picker surfaces (`MediaPicker` — both tabs, including the Upload
tab's submit — `MediaField` persistence, `BodyImagesField`) consume `useMediaLibrary()`,
which is what makes demo desktop-adds work. `useUpload()` remains for the paths outside
this feature's scope (documents via `MainFilesField`, the editor's inline paste/drop
pipeline) with its existing demo hard-throw intact.

## 4. Components

### 4.1 `MediaLibraryGrid.vue` (new, shared)

Search input (debounced), responsive thumbnail grid (image, name, "no alt" badge when
`alternativeText` is empty), **Load more** (20 per page, hidden when a short page returns),
and loading / empty ("No images yet") / error (inline message + Retry) states. Emits
`select(ref: MediaRef)`. In demo-data sessions it renders a one-line note: *"Demo: images
added here last only for this session and are never saved."*

### 4.2 `MediaPicker.vue` (reworked for images)

- `kind="image"`: **UTabs [Library | Upload]**, Library default.
  - **Library tab:** `MediaLibraryGrid` + a pick-confirm panel. Selecting a thumbnail shows
    it with its name and alt. If alt exists → **Use this image** is enabled immediately.
    If alt is missing → a required **Alt text** input (plus optional Caption) gates the
    button; confirming calls `updateInfo(id, { alternativeText, caption? })`, then emits
    `select` with the updated ref. A failed write-back shows a plain-language error and
    does not complete the pick.
  - **Upload tab:** today's dropzone + alt/caption + Upload button — same UI and
    validation, with the submit routed through `useMediaLibrary().uploadImage` so it is
    demo-capable (live behavior is identical to today; it already emits `select` on
    success).
- `kind="file"`: no tabs — today's upload-only UI, unchanged.
- The old `mode: 'upload' | 'browse'` prop and the bare pick-existing grid are **removed**
  (the prop's only consumer, `MediaField`, uses the default; the grid was never wired).

### 4.3 `MediaField.vue` (quirk fix)

Selected-state alt/caption edits keep updating the local `MediaRef` as today, and now also
persist on commit (blur / change event) via `updateInfo` — skipped when the value is
unchanged, skipped for refs with id ≤ 0 (demo/session/sample refs persist in-memory via the
demo adapter instead). A failed persist shows the field-level error and keeps the local
value so the author can retry.

### 4.4 `BodyImagesField.vue`

Adds an **Add from library** control that expands the same `MediaLibraryGrid` inline in the
sidebar panel. A picked image goes through the same alt gate (missing alt → required input
→ write-back) and then joins the tray exactly like an uploaded image — the per-image
Alt/Caption/Position/Alignment insert controls are unchanged (tray alt stays locally
editable; it lands in the figure markdown, which is the body-image contract). The
demo-only **Load sample figures** button is removed; the demo library's seeded figures
serve that purpose through the grid.

## 5. Demo behavior (the one difference: nothing persists)

| Concern | Live | Demo-data session |
|---|---|---|
| Library grid | Real Media Library, newest 20, server search | 24 bundled assets + this session's adds, same contract in-memory |
| Upload from desktop | Real `/upload`; returns library URL | Session-only entry; `blob:` URL; appears at top of grid |
| Alt write-back | `POST /upload?id=` fileInfo update | In-memory update |
| After reload | Everything persisted | Session adds and edits vanish (seed resets) |

Demo "uploads" pass the same extension gate and SVG sanitization as live uploads.

## 6. Security & CSP

- **Demo header set** (`deploy/headers-demo.txt`): `img-src 'self' data:` →
  `img-src 'self' data: blob:`. Production header set (`public/_headers`) is unchanged.
  `tests/unit/security-headers.test.ts` is updated to assert the new demo value —
  a deliberate, reviewed change to a guard test, noted in the changelog.
- **Zero-base64 invariant untouched:** blob: URLs are object URLs, not data: URIs, and they
  exist only in demo-data sessions. A new test asserts a session-added ref (negative id,
  blob: url) is dropped by `mediaIdForWrite` and never reaches a write payload.
- **Write paths:** the Strapi adapter's `upload`/`updateInfo` keep the `isDemoMode()`
  hard-throw; the demo adapter never calls the network. The demo build's CSP
  (`connect-src 'self'`) remains the outer wall.
- **New Strapi permission surfaced:** alt write-back needs the **Author role allowed to
  update upload file info** in Strapi. Added to the runbook's Strapi checklist (§ Strapi
  setup) — verify during the staging rehearsal.
- Library URLs flow through the existing `mediaFromStrapi` mapping and render under the
  production CSP's `img-src 'self' https: data:` as all media URLs do today.

## 7. Error handling

- Grid load failure → inline error + Retry (no toast storms; consistent with form errors).
- Search returning nothing → "No images match" empty state.
- Alt write-back failure → error under the confirm panel; pick does not complete; author
  can retry or switch to the Upload tab.
- `MediaField` persist failure → field-level error; local value kept for retry.
- Demo adapter never produces network errors by construction.

## 8. Testing

TDD throughout; roughly 25–35 new tests.

**Unit (node env)**
- `demo-media-library`: seed size/order/determinism; search; paging; session add
  (negative id, prepended, injectable object-URL used); `updateInfo` mutation; seed never
  mutated; reset-on-reimport contract.
- `upload.ts` `updateFileInfo`: request shape (`POST /upload?id=<id>`, fileInfo JSON),
  mapped return, demo-mode throw.
- `media-library.ts`: Strapi adapter delegates correctly; adapter selection by
  `isDemoData()` (composable-level test in nuxt env if needed).
- Gate parity: demo `uploadImage` rejects disallowed extensions and sanitizes SVGs.
- Invariant: session ref (id ≤ 0) dropped by `mediaIdForWrite`; zero-base64 guard still
  passes across the new paths.
- `security-headers`: demo `img-src` includes `blob:`; production set unchanged.

**Component (nuxt env)**
- `MediaLibraryGrid`: renders items, search emits filtered list, Load more appends,
  loading/empty/error states, `select` emitted, "no alt" badge shown.
- `MediaPicker`: tabs render for images (not files); Library default; pick with alt →
  immediate select; pick without alt → button gated until alt filled → `updateInfo` called
  → select carries updated alt; Upload tab flow unchanged (existing tests keep passing).
- `MediaField`: alt edit on commit calls `updateInfo` once (unchanged value → no call);
  id ≤ 0 → no Strapi call.
- `BodyImagesField`: Add from library → grid → picked image joins tray with library
  alt/caption; Load-sample-figures button gone; insert controls unchanged.

## 9. Documentation

- `CHANGELOG.md` entry (feature + the deliberate demo-CSP change + the quirk fix).
- Design spec status table (`docs/ICJIA-Studio-20-rewrite-copperhead.md` §3/§7) gains the
  library-picker row; README feature list updated.
- `docs/demo-to-production.md` Strapi checklist gains the upload-file-info permission item.
