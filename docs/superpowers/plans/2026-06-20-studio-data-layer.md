# Studio Data Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

## 📋 For managers — what is this, and is it legit?

**What this document is.** The construction recipe for the Studio's **content engine** — the invisible layer that lets the app read the three kinds of content (articles, apps, datasets) out of the content system and write new drafts back into it, *correctly and safely*. The login plan came first; this is the part that actually moves content.

**Why so technical?** Because this is the plumbing. It has no buttons or screens of its own — those come in a later plan. What it does have is strict rules about *shape* (every article has a title, a date, authors, images, and so on) and one rule we care about a lot: **no image is ever stored as a giant blob of text ("base64") — every image is a reference to a file in the Media Library.** This plan turns that promise into automated tests that fail the build if anyone ever breaks it.

**Is it real, or jargon?** Real, and routine:
- Every small step **writes a test first, then the code** (Test-Driven Development).
- Every step ends in a **save point** (a commit) — traceable and reversible.
- We **verified the real content system first** (read-only) so the code matches reality, not guesses — including the exact list of article types and the precise shape of every field.

**What you get when this plan is done.** A tested, reusable content engine: the app can fetch any article/app/dataset by its stable ID, list drafts vs. published items, and save a new draft — with the "no base64 images" rule enforced automatically. The forms and screens that use this engine arrive in the plans that follow.

**Bottom line.** Legitimate, careful plumbing — written in detail so it's correct, reviewable, and safe, and so the headline promise (no base64 images) is guaranteed by tests rather than hope.

---

**Goal:** Build the typed, tested data-access layer for articles, apps, and datasets — Strapi 5 REST repositories addressed by `documentId`, with mappers (Strapi ⇄ domain), validators (including a hard zero-base64 gate), v1 text-import parsers, and thin `useArticles`/`useApps`/`useDatasets` composables.

**Architecture:** Pure, dependency-injected functions hold all logic (mirroring the existing `lib/auth.ts` pattern): mappers and validators are plain functions over plain objects; a generic `createRepository(...)` factory takes the configured `$Fetch` client and returns `list/findOne/create/update/remove`. Composables are one-line wiring that binds `$api`. Everything is unit-tested against fixtures captured from the live Strapi 5 instance — no network in tests.

**Tech Stack:** Nuxt 4 (SPA), Vue 3.5, Pinia, TypeScript, `ofetch` (`$api`), Vitest + `@nuxt/test-utils`.

## Global Constraints

*Every task's requirements implicitly include this section. Values are copied from the design spec (`docs/superpowers/specs/2026-06-19-researchhub-studio-2026-design.md`) and confirmed by read-only introspection on 2026-06-20.*

- **Stack:** Nuxt 4 **SPA** (`ssr: false`), Nuxt UI 4, Pinia, **TypeScript**, Strapi 5 **REST** (`/api/*`).
- **Identifiers:** entries are addressed by **`documentId`** (string), never numeric `id`. The numeric `id`, `legacyId` (old Strapi 3 Mongo `_id`), and the legacy `status` string are **read-only noise — never sent on writes**.
- **Draft & Publish:** native. **`publishedAt` is the source of truth** (`null` = draft). Reads filter with `?status=draft|published`. The legacy `status` field is ignored.
- **ZERO base64 images.** Every image/file is a Media Library upload referenced by relation or URL. `images[].src` is a **Media Library URL only, never a `data:` URI**. This is enforced by `lib/base64-guard.ts` and asserted in validator tests.
- **No Strapi schema/backend changes.** This layer only reads and writes through the *existing* REST endpoints; it adds no Strapi routes, controllers, or permissions.
- **Strapi 5 REST envelope (confirmed shape):**
  - Collection: `{ data: Entity[], meta: { pagination: { page, pageSize, pageCount, total } } }`
  - Single: `{ data: Entity, meta: {} }`
  - Entity attributes are **flattened** onto the entity (no v4 `.attributes` wrapper): `{ documentId, title, ... }`.
  - Populated **media** is a single object `{ id, documentId, name, alternativeText, url, width, height, mime, formats, ... }` (or `null`).
  - Populated **relations** are an **array** of flattened entities (each has `documentId, title, slug, ...`).
  - **Writes** wrap the payload in `{ data: { ... } }`. Media fields are set by **numeric file `id`** (or `null` to clear). Relation fields are set by an **array of related `documentId` strings**.
- **Config / target:** the Strapi base URL is env-driven — `NUXT_PUBLIC_STRAPI_BASE_URL` → `runtimeConfig.public.strapiBaseUrl` (already wired). Dev default is the **dev Strapi 5** at `https://v2.hub.icjia-api.cloud`; all dev reads **and writes** target the dev instance. Production points elsewhere via a Netlify env var — no code change.
- **Testability:** all logic lives in pure functions that take their dependencies (`$Fetch`) as arguments; Nuxt composables are thin wrappers. Mirror `app/lib/auth.ts` + `app/composables/useAuth.ts`.
- **Process:** TDD (red → green → refactor), frequent commits, pristine test output. Commit messages carry **no AI co-author trailer** (per project CLAUDE.md). Do not bump the pinned Pinia 2.x dependency stack.

## Confirmed field facts (from live introspection 2026-06-20)

- **Article `type` enum** (`ENUM_ARTICLE_TYPE`): `annualReport`, `article`, `dataset`, `evaluation`, `general`, `newsletter`, `process_evaluation`, `programEvaluationSummary`, `researchAtAGlance`, `researchBulletin`, `researchReport`, `strategicPlan`, `toolkit`, `update`.
- **App `contributors`**: `{ title }[]` (no `description` in live data; model `description` as optional).
- **Dataset `timeperiod`**: `{ yeartype: string, yearmin: number, yearmax: number }`.
- **Dataset `variables`**: `{ name, type, definition }[]` (live data has no `values`; model `values` as optional).
- **Dataset `sources`**: `{ title, url }[]`; **`notes`**: `string[]`.
- **Article `authors`**: `{ title, description }[]`; **`images`**: `{ title, src }[]`.
- v1 option lists (`src/consts/fieldOptions.js`): categories `['corrections','courts','crimes','law enforcement','victims','other']`; mainfiletype `['full report','pdf version']`; timeperiod types `['calendar','fiscal-Federal','fiscal-Illinois','other']`; units `['national','state','county','municipal','other']`.

## File structure

```
app/
├── types/
│   └── content.ts            # domain models + JSON sub-shapes + ContentStatus
├── lib/
│   ├── field-options.ts      # option constants (categories, units, article types, …)
│   ├── slug.ts               # slugify(title)
│   ├── base64-guard.ts       # containsBase64 / assertNoBase64  (zero-base64 invariant)
│   ├── strapi-rest.ts        # envelope types + media/relation flatten helpers
│   ├── text-import.ts        # v1 delimited-string parsers/formatters (import convenience)
│   ├── repository.ts         # generic createRepository(...) factory
│   ├── mappers/
│   │   ├── article.ts        # StrapiArticle ⇄ Article
│   │   ├── app.ts            # StrapiApp ⇄ App
│   │   └── dataset.ts        # StrapiDataset ⇄ Dataset
│   └── validators/
│       ├── article.ts        # validateArticle
│       ├── app.ts            # validateApp
│       └── dataset.ts        # validateDataset
├── repositories/
│   ├── articles.ts           # createArticlesRepository(api)
│   ├── apps.ts               # createAppsRepository(api)
│   └── datasets.ts           # createDatasetsRepository(api)
└── composables/
    ├── useArticles.ts        # binds $api → createArticlesRepository
    ├── useApps.ts
    └── useDatasets.ts

tests/
├── fixtures/
│   └── strapi.ts             # rawArticle / rawApp / rawDataset (faithful live shapes)
└── unit/
    ├── field-options.test.ts
    ├── slug.test.ts
    ├── base64-guard.test.ts
    ├── strapi-rest.test.ts
    ├── text-import.test.ts
    ├── mappers-article.test.ts
    ├── mappers-app.test.ts
    ├── mappers-dataset.test.ts
    ├── validators.test.ts
    ├── repository.test.ts
    └── repositories.test.ts
```

---

### Task 1: Field option constants

**Files:**
- Create: `app/lib/field-options.ts`
- Test: `tests/unit/field-options.test.ts`

**Interfaces:**
- Produces: `CATEGORY_OPTIONS`, `MAINFILETYPE_OPTIONS`, `TIMEPERIOD_TYPE_OPTIONS`, `UNIT_OPTIONS`, `ARTICLE_TYPE_OPTIONS` — all `readonly string[]`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/field-options.test.ts
import { describe, it, expect } from 'vitest'
import {
  CATEGORY_OPTIONS, MAINFILETYPE_OPTIONS, TIMEPERIOD_TYPE_OPTIONS,
  UNIT_OPTIONS, ARTICLE_TYPE_OPTIONS,
} from '~/lib/field-options'

describe('field options', () => {
  it('keeps the v1 category list', () => {
    expect(CATEGORY_OPTIONS).toEqual(['corrections', 'courts', 'crimes', 'law enforcement', 'victims', 'other'])
  })
  it('keeps the v1 mainfiletype, timeperiod, and unit lists', () => {
    expect(MAINFILETYPE_OPTIONS).toEqual(['full report', 'pdf version'])
    expect(TIMEPERIOD_TYPE_OPTIONS).toEqual(['calendar', 'fiscal-Federal', 'fiscal-Illinois', 'other'])
    expect(UNIT_OPTIONS).toEqual(['national', 'state', 'county', 'municipal', 'other'])
  })
  it('lists all 14 confirmed article types', () => {
    expect(ARTICLE_TYPE_OPTIONS).toContain('researchReport')
    expect(ARTICLE_TYPE_OPTIONS).toContain('process_evaluation')
    expect(ARTICLE_TYPE_OPTIONS).toHaveLength(14)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/field-options.test.ts`
Expected: FAIL — `Cannot find module '~/lib/field-options'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/lib/field-options.ts
// Option lists ported from v1 src/consts/fieldOptions.js; ARTICLE_TYPE_OPTIONS confirmed
// against ENUM_ARTICLE_TYPE by read-only GraphQL introspection (2026-06-20).

export const CATEGORY_OPTIONS = [
  'corrections', 'courts', 'crimes', 'law enforcement', 'victims', 'other',
] as const

export const MAINFILETYPE_OPTIONS = ['full report', 'pdf version'] as const

export const TIMEPERIOD_TYPE_OPTIONS = [
  'calendar', 'fiscal-Federal', 'fiscal-Illinois', 'other',
] as const

export const UNIT_OPTIONS = ['national', 'state', 'county', 'municipal', 'other'] as const

export const ARTICLE_TYPE_OPTIONS = [
  'annualReport', 'article', 'dataset', 'evaluation', 'general', 'newsletter',
  'process_evaluation', 'programEvaluationSummary', 'researchAtAGlance',
  'researchBulletin', 'researchReport', 'strategicPlan', 'toolkit', 'update',
] as const
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/field-options.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/field-options.ts tests/unit/field-options.test.ts
git commit -m "feat(data): add Strapi field option constants"
```

---

### Task 2: Slug helper

**Files:**
- Create: `app/lib/slug.ts`
- Test: `tests/unit/slug.test.ts`

**Interfaces:**
- Produces: `slugify(title: string): string`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/slug.test.ts
import { describe, it, expect } from 'vitest'
import { slugify } from '~/lib/slug'

describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugify('Crime In Illinois')).toBe('crime-in-illinois')
  })
  it('turns slashes into hyphens and strips punctuation', () => {
    expect(slugify('Courts / Crimes & Victims!')).toBe('courts-crimes-victims')
  })
  it('collapses repeats and trims leading/trailing hyphens', () => {
    expect(slugify('  --Hello   World--  ')).toBe('hello-world')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/slug.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/lib/slug.ts
// Ported from v1 slug semantics (design spec §10): lowercase, spaces/slashes → '-',
// strip non-word chars, collapse repeats, trim hyphens.
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[\s/]+/g, '-')   // spaces and slashes → hyphen
    .replace(/[^\w-]+/g, '')    // strip anything not a word char or hyphen
    .replace(/-+/g, '-')        // collapse repeated hyphens
    .replace(/^-+|-+$/g, '')    // trim leading/trailing hyphens
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/slug.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/slug.ts tests/unit/slug.test.ts
git commit -m "feat(data): add slugify helper"
```

---

### Task 3: Zero-base64 guard

**Files:**
- Create: `app/lib/base64-guard.ts`
- Test: `tests/unit/base64-guard.test.ts`

**Interfaces:**
- Produces: `containsBase64(value: unknown): boolean`; `assertNoBase64(value: unknown, label?: string): void` (throws `Error` if base64 image data is found).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/base64-guard.test.ts
import { describe, it, expect } from 'vitest'
import { containsBase64, assertNoBase64 } from '~/lib/base64-guard'

describe('containsBase64', () => {
  it('detects a data: image URI in a string', () => {
    expect(containsBase64('![x](data:image/png;base64,iVBORw0KGgo=)')).toBe(true)
  })
  it('allows ordinary Media Library URLs', () => {
    expect(containsBase64('/uploads/figure_abc123.png')).toBe(false)
    expect(containsBase64('https://v2.hub.icjia-api.cloud/uploads/x.png')).toBe(false)
  })
  it('scans nested arrays and objects', () => {
    expect(containsBase64({ images: [{ title: 'f', src: 'data:image/jpeg;base64,/9j/4AAQ' }] })).toBe(true)
    expect(containsBase64({ images: [{ title: 'f', src: '/uploads/f.jpg' }] })).toBe(false)
  })
})

describe('assertNoBase64', () => {
  it('throws with a helpful message on base64', () => {
    expect(() => assertNoBase64('data:image/png;base64,AAAA', 'markdown'))
      .toThrow(/markdown/)
  })
  it('does not throw on clean content', () => {
    expect(() => assertNoBase64({ src: '/uploads/ok.png' })).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/base64-guard.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/lib/base64-guard.ts
// The zero-base64 invariant (design spec §7, §13). Every image must be a Media Library
// reference; a base64 `data:...;base64,...` blob must never enter a write payload.
const BASE64_DATA_URI = /data:[^;,\s]*;base64,/i

export function containsBase64(value: unknown): boolean {
  if (typeof value === 'string') return BASE64_DATA_URI.test(value)
  if (Array.isArray(value)) return value.some(containsBase64)
  if (value && typeof value === 'object') return Object.values(value).some(containsBase64)
  return false
}

export function assertNoBase64(value: unknown, label = 'content'): void {
  if (containsBase64(value)) {
    throw new Error(
      `Base64 image data is not allowed in ${label}. Upload the image to the Media Library and reference its URL instead.`,
    )
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/base64-guard.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/base64-guard.ts tests/unit/base64-guard.test.ts
git commit -m "feat(data): add zero-base64 guard"
```

---

### Task 4: Domain types + Strapi-5 envelope/media/relation helpers + fixtures

**Files:**
- Create: `app/types/content.ts`
- Create: `app/lib/strapi-rest.ts`
- Create: `tests/fixtures/strapi.ts`
- Test: `tests/unit/strapi-rest.test.ts`

**Interfaces:**
- Produces (types): `ContentStatus`, `MediaRef`, `RelationRef`, `Author`, `Contributor`, `ImageRef`, `Source`, `Variable`, `TimePeriod`, `BaseContent`, `Article`, `App`, `Dataset`, and write payloads `ArticleWrite`, `AppWrite`, `DatasetWrite`.
- Produces (helpers): `StrapiListResponse<T>`, `StrapiSingleResponse<T>`, `StrapiMedia`, `StrapiRelation`, `unwrapList`, `unwrapOne`, `mediaFromStrapi`, `mediaIdForWrite`, `relationsFromStrapi`, `relationsToWrite`.
- Produces (fixtures): `rawArticle`, `rawApp`, `rawDataset` — plain objects shaped like live Strapi 5 responses.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/strapi-rest.test.ts
import { describe, it, expect } from 'vitest'
import {
  unwrapList, unwrapOne, mediaFromStrapi, mediaIdForWrite,
  relationsFromStrapi, relationsToWrite,
} from '~/lib/strapi-rest'

describe('strapi-rest helpers', () => {
  it('unwraps collection and single envelopes', () => {
    expect(unwrapList({ data: [1, 2], meta: { pagination: { page: 1, pageSize: 25, pageCount: 1, total: 2 } } })).toEqual([1, 2])
    expect(unwrapOne({ data: { documentId: 'x' }, meta: {} })).toEqual({ documentId: 'x' })
  })

  it('maps a populated media object to a MediaRef and back to its numeric id', () => {
    const media = { id: 10, documentId: 'm', name: 's.png', alternativeText: null, url: '/uploads/s.png', width: 1200, height: 630, mime: 'image/png' }
    expect(mediaFromStrapi(media)).toEqual({ id: 10, url: '/uploads/s.png', name: 's.png', alternativeText: null, width: 1200, height: 630, mime: 'image/png' })
    expect(mediaFromStrapi(null)).toBeNull()
    expect(mediaIdForWrite(mediaFromStrapi(media))).toBe(10)
    expect(mediaIdForWrite(null)).toBeNull()
  })

  it('maps populated relations to {documentId,title,slug} and back to documentId[]', () => {
    const rels = [{ id: 5, documentId: 'd1', title: 'Crime Data', slug: 'crime-data', extra: 'ignored' }]
    expect(relationsFromStrapi(rels)).toEqual([{ documentId: 'd1', title: 'Crime Data', slug: 'crime-data' }])
    expect(relationsFromStrapi(null)).toEqual([])
    expect(relationsToWrite([{ documentId: 'd1', title: 'Crime Data', slug: 'crime-data' }])).toEqual(['d1'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/strapi-rest.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/types/content.ts
export type ContentStatus = 'draft' | 'published'

/** A Media Library reference. `id` is the numeric upload id used on writes; `url` is for display. */
export interface MediaRef {
  id: number
  url: string
  name?: string
  alternativeText?: string | null
  width?: number | null
  height?: number | null
  mime?: string
}

/** A related entry, addressed by documentId. */
export interface RelationRef {
  documentId: string
  title: string
  slug: string
}

export interface Author { title: string; description?: string }
export interface Contributor { title: string; description?: string }
/** Inline article figure. `src` is a Media Library URL — NEVER base64. */
export interface ImageRef { title: string; src: string }
export interface Source { title: string; url: string }
export interface Variable { name: string; type: string; definition: string; values?: string }
export interface TimePeriod { yeartype: string; yearmin: number | string; yearmax: number | string }

export interface BaseContent {
  documentId: string
  title: string
  slug: string
  date: string | null
  external: boolean
  categories: string[]
  tags: string[]
  citation: string | null
  funding: string | null
  /** null = draft. Source of truth for Draft & Publish. */
  publishedAt: string | null
}

export interface Article extends BaseContent {
  type: string | null
  hideFromBanner: boolean
  authors: Author[]
  abstract: string | null
  markdown: string
  splash: MediaRef | null
  thumbnail: MediaRef | null
  images: ImageRef[]
  mainfiletype: string | null
  mainfile: MediaRef | null
  extrafile: MediaRef | null
  doi: string | null
  apps: RelationRef[]
  datasets: RelationRef[]
}

export interface App extends BaseContent {
  contributors: Contributor[]
  image: MediaRef | null
  description: string | null
  url: string | null
  datasets: RelationRef[]
  articles: RelationRef[]
}

export interface Dataset extends BaseContent {
  project: boolean
  sources: Source[]
  unit: string | null
  timeperiod: TimePeriod | null
  description: string | null
  notes: string[]
  variables: Variable[]
  datafile: MediaRef | null
  apps: RelationRef[]
  articles: RelationRef[]
}

// Write payloads: media → numeric id (or null), relations → documentId[]. No documentId/publishedAt/legacy fields.
export interface ArticleWrite {
  title: string; slug: string; date: string | null; external: boolean
  type: string | null; hideFromBanner: boolean
  categories: string[]; tags: string[]; authors: Author[]
  abstract: string | null; markdown: string
  splash: number | null; thumbnail: number | null; images: ImageRef[]
  mainfiletype: string | null; mainfile: number | null; extrafile: number | null
  doi: string | null; citation: string | null; funding: string | null
  apps: string[]; datasets: string[]
}
export interface AppWrite {
  title: string; slug: string; date: string | null; external: boolean
  categories: string[]; tags: string[]; contributors: Contributor[]
  image: number | null; description: string | null; url: string | null
  citation: string | null; funding: string | null
  datasets: string[]; articles: string[]
}
export interface DatasetWrite {
  title: string; slug: string; date: string | null; external: boolean
  project: boolean; categories: string[]; tags: string[]
  sources: Source[]; unit: string | null; timeperiod: TimePeriod | null
  description: string | null; notes: string[]; variables: Variable[]
  citation: string | null; funding: string | null
  datafile: number | null; apps: string[]; articles: string[]
}
```

```ts
// app/lib/strapi-rest.ts
import type { MediaRef, RelationRef } from '~/types/content'

export interface StrapiPagination { page: number; pageSize: number; pageCount: number; total: number }
export interface StrapiListResponse<T> { data: T[]; meta: { pagination: StrapiPagination } }
export interface StrapiSingleResponse<T> { data: T; meta: Record<string, unknown> }

export function unwrapList<T>(res: StrapiListResponse<T>): T[] { return res.data }
export function unwrapOne<T>(res: StrapiSingleResponse<T>): T { return res.data }

/** Shape of a populated Strapi 5 media object (flattened, not v4 `.data.attributes`). */
export interface StrapiMedia {
  id: number
  url: string
  name?: string
  alternativeText?: string | null
  width?: number | null
  height?: number | null
  mime?: string
}

export function mediaFromStrapi(m: StrapiMedia | null | undefined): MediaRef | null {
  if (!m) return null
  return {
    id: m.id,
    url: m.url,
    name: m.name,
    alternativeText: m.alternativeText ?? null,
    width: m.width ?? null,
    height: m.height ?? null,
    mime: m.mime,
  }
}

export function mediaIdForWrite(ref: MediaRef | null | undefined): number | null {
  return ref?.id ?? null
}

/** Shape of a populated Strapi 5 relation entry (only the fields we keep). */
export interface StrapiRelation { documentId: string; title: string; slug: string }

export function relationsFromStrapi(arr: StrapiRelation[] | null | undefined): RelationRef[] {
  return (arr ?? []).map((r) => ({ documentId: r.documentId, title: r.title, slug: r.slug }))
}

export function relationsToWrite(refs: RelationRef[] | null | undefined): string[] {
  return (refs ?? []).map((r) => r.documentId)
}
```

```ts
// tests/fixtures/strapi.ts
// Faithful (trimmed) copies of live Strapi 5 REST entities, captured 2026-06-20 from the
// dev instance. Used by mapper tests so they verify real shapes, not invented ones.

export const rawArticle = {
  id: 1, documentId: 'igo619j501vpj10sg8ecfv74', legacyId: '5da0c0dd3bb01c36d66f6891', status: 'published',
  title: 'Evaluation of Youth Summer Job Program', slug: 'evaluation-of-youth-summer-job-program',
  date: '2015-08-18', external: false, type: null, hideFromBanner: false,
  categories: ['other'], tags: ['juvenile', 'evaluation', 'prevention'],
  authors: [{ title: 'Jessica Reichert', description: "Manages ICJIA's CJRE." }],
  images: [{ title: 'figure1', src: '/uploads/figure1_fdafcd09e1.png' }],
  abstract: 'An abstract.', markdown: '# Body\n\n![figure1](/uploads/figure1_fdafcd09e1.png)',
  mainfiletype: 'full report', doi: null, citation: null, funding: null,
  publishedAt: '2026-03-16T18:45:02.898Z',
  splash: { id: 10, documentId: 'splashdoc', name: 'splash.png', alternativeText: null, url: '/uploads/splash_abc.png', width: 1200, height: 630, mime: 'image/png' },
  thumbnail: null,
  mainfile: { id: 11, documentId: 'mfdoc', name: 'report.pdf', url: '/uploads/report_abc.pdf', mime: 'application/pdf' },
  extrafile: null,
  apps: [],
  datasets: [{ id: 5, documentId: 'dsdoc1', title: 'Crime Data', slug: 'crime-data', status: 'published' }],
}

export const rawApp = {
  id: 2, documentId: 'appdoc1', legacyId: 'abc', status: 'published',
  title: 'UCR Index Offense Explorer', slug: 'ucr-index-offense-explorer', date: '2020-01-01', external: false,
  categories: ['crimes'], tags: ['ucr', 'explorer'],
  contributors: [{ title: 'ICJIA R&A staff' }],
  image: { id: 1046, documentId: 'imgdoc', name: 'app-image.png', alternativeText: null, url: '/uploads/app_image_22cc0163e1.png', width: 720, height: 342, mime: 'image/png' },
  description: 'Explore UCR data.', url: 'https://example.org/app', citation: null, funding: null,
  publishedAt: '2026-03-16T18:45:02.898Z',
  datasets: [{ id: 5, documentId: 'dsdoc1', title: 'Crime Data', slug: 'crime-data', status: 'published' }],
  articles: [],
}

export const rawDataset = {
  id: 5, documentId: 'dsdoc1', legacyId: 'def', status: 'published',
  title: 'Crime Data', slug: 'crime-data', date: '2021-01-01', external: false, project: false,
  categories: ['crimes'], tags: ['ucr'],
  sources: [{ title: 'UCR, Illinois State Police', url: 'https://isp.illinois.gov/x' }],
  unit: 'county', timeperiod: { yeartype: 'calendar', yearmin: 1982, yearmax: 2020 },
  description: 'County crime counts.',
  notes: ['Counties may not add up to the state total.'],
  variables: [
    { name: 'Year', type: 'integer', definition: 'The year events occurred.' },
    { name: 'id', type: 'int', definition: 'Location identifier.' },
  ],
  citation: null, funding: null, publishedAt: '2026-03-16T18:45:02.898Z',
  datafile: { id: 99, documentId: 'dfdoc', name: 'crime.csv', url: '/uploads/crime_abc.csv', mime: 'text/csv' },
  apps: [{ id: 2, documentId: 'appdoc1', title: 'UCR Index Offense Explorer', slug: 'ucr-index-offense-explorer', status: 'published' }],
  articles: [],
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/strapi-rest.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/types/content.ts app/lib/strapi-rest.ts tests/fixtures/strapi.ts tests/unit/strapi-rest.test.ts
git commit -m "feat(data): add domain types, Strapi-5 envelope helpers, and fixtures"
```

---

### Task 5: Text-import parsers

**Files:**
- Create: `app/lib/text-import.ts`
- Test: `tests/unit/text-import.test.ts`

**Interfaces:**
- Consumes: `Author`, `Source`, `Variable`, `TimePeriod` from `~/types/content`.
- Produces: `parseList`, `parseAuthors`, `parseSources`, `parseVariables`, `parseNotes`, `parseTimeperiod`, and the reverse `formatAuthors`, `formatSources`, `formatVariables`, `formatNotes`, `formatTimeperiodRange`.

*Semantics ported verbatim from v1 `src/utils/parseItem.js` + `prepareItem.js`: rows split on newlines, fields split on `|`, lists split on `,`, all trimmed. This is the optional "paste delimited text → structured rows" convenience (design spec §10); storage is always structured JSON.*

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/text-import.test.ts
import { describe, it, expect } from 'vitest'
import {
  parseList, parseAuthors, parseSources, parseVariables, parseNotes, parseTimeperiod,
  formatAuthors, formatSources, formatVariables, formatNotes, formatTimeperiodRange,
} from '~/lib/text-import'

describe('parse helpers (text → structured)', () => {
  it('parses comma lists, trimming and dropping blanks', () => {
    expect(parseList('a, b ,, c')).toEqual(['a', 'b', 'c'])
  })
  it('parses authors as title | description rows', () => {
    expect(parseAuthors('Jane Doe | Researcher\nJohn Roe | Analyst')).toEqual([
      { title: 'Jane Doe', description: 'Researcher' },
      { title: 'John Roe', description: 'Analyst' },
    ])
  })
  it('parses sources and variables on the pipe', () => {
    expect(parseSources('UCR | https://x')).toEqual([{ title: 'UCR', url: 'https://x' }])
    expect(parseVariables('Year | integer | The year | 1982-2020')).toEqual([
      { name: 'Year', type: 'integer', definition: 'The year', values: '1982-2020' },
    ])
  })
  it('parses notes lines and a timeperiod range', () => {
    expect(parseNotes('one\n\ntwo')).toEqual(['one', 'two'])
    expect(parseTimeperiod('calendar', '1982-2020')).toEqual({ yeartype: 'calendar', yearmin: '1982', yearmax: '2020' })
  })
})

describe('format helpers (structured → text, for editing)', () => {
  it('round-trips authors and sources', () => {
    expect(formatAuthors([{ title: 'Jane', description: 'R' }])).toBe('Jane | R')
    expect(formatSources([{ title: 'UCR', url: 'https://x' }])).toBe('UCR | https://x')
  })
  it('formats variables, notes, and a timeperiod range', () => {
    expect(formatVariables([{ name: 'Year', type: 'integer', definition: 'y', values: '1-2' }])).toBe('Year | integer | y | 1-2')
    expect(formatNotes(['a', 'b'])).toBe('a\nb')
    expect(formatTimeperiodRange({ yeartype: 'calendar', yearmin: 1982, yearmax: 2020 })).toBe('1982-2020')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/text-import.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/lib/text-import.ts
// Optional "paste delimited text → structured rows" import convenience (design spec §10).
// Semantics ported from v1 src/utils/parseItem.js and prepareItem.js. Storage is always JSON.
import type { Author, Source, Variable, TimePeriod } from '~/types/content'

const rows = (s: string) => s.split(/[\r\n]+/).map((r) => r.trim()).filter(Boolean)
const cols = (s: string, sep = '|') => s.split(sep).map((c) => c.trim())

export function parseList(str: string, sep = ','): string[] {
  return str.split(sep).map((s) => s.trim()).filter(Boolean)
}

export function parseAuthors(authorString: string): Author[] {
  return rows(authorString).map((row) => {
    const [title, description] = cols(row)
    return { title, description }
  })
}

export function parseSources(sourceString: string): Source[] {
  return rows(sourceString).map((row) => {
    const [title, url] = cols(row)
    return { title, url }
  })
}

export function parseVariables(variableString: string): Variable[] {
  return rows(variableString).map((row) => {
    const [name, type, definition, values] = cols(row)
    return { name, type, definition, values }
  })
}

export function parseNotes(noteString: string): string[] {
  return rows(noteString)
}

export function parseTimeperiod(yeartype: string, range: string): TimePeriod {
  const [yearmin, yearmax] = range.split('-').map((s) => s.trim())
  return { yeartype, yearmin, yearmax }
}

export function formatAuthors(authors: Author[]): string {
  return authors.map((a) => `${a.title} | ${a.description ?? ''}`.trim()).join('\n')
}

export function formatSources(sources: Source[]): string {
  return sources.map((s) => `${s.title} | ${s.url}`).join('\n')
}

export function formatVariables(variables: Variable[]): string {
  return variables.map((v) => `${v.name} | ${v.type} | ${v.definition} | ${v.values ?? ''}`.trim()).join('\n')
}

export function formatNotes(notes: string[]): string {
  return notes.join('\n')
}

export function formatTimeperiodRange(tp: TimePeriod): string {
  return `${tp.yearmin}-${tp.yearmax}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/text-import.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/text-import.ts tests/unit/text-import.test.ts
git commit -m "feat(data): add v1 delimited-text import/format helpers"
```

---

### Task 6: Article mapper

**Files:**
- Create: `app/lib/mappers/article.ts`
- Test: `tests/unit/mappers-article.test.ts`

**Interfaces:**
- Consumes: `Article`, `ArticleWrite` from `~/types/content`; `mediaFromStrapi`, `mediaIdForWrite`, `relationsFromStrapi`, `relationsToWrite`, `StrapiMedia`, `StrapiRelation` from `~/lib/strapi-rest`; `rawArticle` fixture.
- Produces: `StrapiArticle` (raw type), `articleFromStrapi(raw: StrapiArticle): Article`, `articleToWrite(model: Article): ArticleWrite`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/mappers-article.test.ts
import { describe, it, expect } from 'vitest'
import { articleFromStrapi, articleToWrite } from '~/lib/mappers/article'
import { rawArticle } from '../fixtures/strapi'

describe('articleFromStrapi', () => {
  const a = articleFromStrapi(rawArticle as never)

  it('keeps documentId and core fields, ignoring legacy id/status', () => {
    expect(a.documentId).toBe('igo619j501vpj10sg8ecfv74')
    expect(a).not.toHaveProperty('legacyId')
    expect(a).not.toHaveProperty('status')
    expect(a.publishedAt).toBe('2026-03-16T18:45:02.898Z')
  })
  it('flattens media to MediaRef and relations to {documentId,title,slug}', () => {
    expect(a.splash).toEqual({ id: 10, url: '/uploads/splash_abc.png', name: 'splash.png', alternativeText: null, width: 1200, height: 630, mime: 'image/png' })
    expect(a.thumbnail).toBeNull()
    expect(a.datasets).toEqual([{ documentId: 'dsdoc1', title: 'Crime Data', slug: 'crime-data' }])
  })
  it('preserves JSON arrays as-is', () => {
    expect(a.authors).toEqual([{ title: 'Jessica Reichert', description: "Manages ICJIA's CJRE." }])
    expect(a.images).toEqual([{ title: 'figure1', src: '/uploads/figure1_fdafcd09e1.png' }])
  })
})

describe('articleToWrite', () => {
  it('converts media to numeric id and relations to documentId[]', () => {
    const w = articleToWrite(articleFromStrapi(rawArticle as never))
    expect(w.splash).toBe(10)
    expect(w.thumbnail).toBeNull()
    expect(w.datasets).toEqual(['dsdoc1'])
    expect(w).not.toHaveProperty('documentId')
    expect(w).not.toHaveProperty('publishedAt')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/mappers-article.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/lib/mappers/article.ts
import type { Article, ArticleWrite, Author, ImageRef } from '~/types/content'
import {
  mediaFromStrapi, mediaIdForWrite, relationsFromStrapi, relationsToWrite,
  type StrapiMedia, type StrapiRelation,
} from '~/lib/strapi-rest'

export interface StrapiArticle {
  documentId: string; title: string; slug: string; date: string | null; external?: boolean
  type?: string | null; hideFromBanner?: boolean
  categories?: string[]; tags?: string[]; authors?: Author[]; images?: ImageRef[]
  abstract?: string | null; markdown?: string
  splash?: StrapiMedia | null; thumbnail?: StrapiMedia | null
  mainfiletype?: string | null; mainfile?: StrapiMedia | null; extrafile?: StrapiMedia | null
  doi?: string | null; citation?: string | null; funding?: string | null
  apps?: StrapiRelation[]; datasets?: StrapiRelation[]
  publishedAt?: string | null
}

export function articleFromStrapi(raw: StrapiArticle): Article {
  return {
    documentId: raw.documentId,
    title: raw.title,
    slug: raw.slug,
    date: raw.date ?? null,
    external: raw.external ?? false,
    type: raw.type ?? null,
    hideFromBanner: raw.hideFromBanner ?? false,
    categories: raw.categories ?? [],
    tags: raw.tags ?? [],
    authors: raw.authors ?? [],
    abstract: raw.abstract ?? null,
    markdown: raw.markdown ?? '',
    splash: mediaFromStrapi(raw.splash),
    thumbnail: mediaFromStrapi(raw.thumbnail),
    images: raw.images ?? [],
    mainfiletype: raw.mainfiletype ?? null,
    mainfile: mediaFromStrapi(raw.mainfile),
    extrafile: mediaFromStrapi(raw.extrafile),
    doi: raw.doi ?? null,
    citation: raw.citation ?? null,
    funding: raw.funding ?? null,
    apps: relationsFromStrapi(raw.apps),
    datasets: relationsFromStrapi(raw.datasets),
    publishedAt: raw.publishedAt ?? null,
  }
}

export function articleToWrite(m: Article): ArticleWrite {
  return {
    title: m.title,
    slug: m.slug,
    date: m.date,
    external: m.external,
    type: m.type,
    hideFromBanner: m.hideFromBanner,
    categories: m.categories,
    tags: m.tags,
    authors: m.authors,
    abstract: m.abstract,
    markdown: m.markdown,
    splash: mediaIdForWrite(m.splash),
    thumbnail: mediaIdForWrite(m.thumbnail),
    images: m.images,
    mainfiletype: m.mainfiletype,
    mainfile: mediaIdForWrite(m.mainfile),
    extrafile: mediaIdForWrite(m.extrafile),
    doi: m.doi,
    citation: m.citation,
    funding: m.funding,
    apps: relationsToWrite(m.apps),
    datasets: relationsToWrite(m.datasets),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/mappers-article.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/mappers/article.ts tests/unit/mappers-article.test.ts
git commit -m "feat(data): add article mapper (Strapi 5 <-> domain)"
```

---

### Task 7: Article validator

**Files:**
- Create: `app/lib/validators/article.ts`
- Test: `tests/unit/validators.test.ts` (article section)

**Interfaces:**
- Consumes: `Article` from `~/types/content`; `ARTICLE_TYPE_OPTIONS` from `~/lib/field-options`; `containsBase64` from `~/lib/base64-guard`.
- Produces: `FieldError { field: string; message: string }`; `validateArticle(a: Article): FieldError[]`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/validators.test.ts
import { describe, it, expect } from 'vitest'
import { validateArticle } from '~/lib/validators/article'
import type { Article } from '~/types/content'

const baseArticle = (over: Partial<Article> = {}): Article => ({
  documentId: '', title: 'T', slug: 't', date: '2020-01-01', external: false,
  type: null, hideFromBanner: false, categories: [], tags: [], authors: [],
  abstract: null, markdown: '', splash: null, thumbnail: null, images: [],
  mainfiletype: null, mainfile: null, extrafile: null, doi: null,
  citation: null, funding: null, apps: [], datasets: [], publishedAt: null, ...over,
})

describe('validateArticle', () => {
  it('passes a valid article', () => {
    expect(validateArticle(baseArticle())).toEqual([])
  })
  it('requires title, slug, and date', () => {
    const errs = validateArticle(baseArticle({ title: ' ', slug: '', date: null }))
    expect(errs.map((e) => e.field).sort()).toEqual(['date', 'slug', 'title'])
  })
  it('rejects an unknown article type', () => {
    expect(validateArticle(baseArticle({ type: 'bogus' }))).toContainEqual(expect.objectContaining({ field: 'type' }))
  })
  it('rejects base64 in images[].src and in markdown', () => {
    expect(validateArticle(baseArticle({ images: [{ title: 'x', src: 'data:image/png;base64,AAAA' }] })))
      .toContainEqual(expect.objectContaining({ field: 'images' }))
    expect(validateArticle(baseArticle({ markdown: '![x](data:image/png;base64,AAAA)' })))
      .toContainEqual(expect.objectContaining({ field: 'markdown' }))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/validators.test.ts`
Expected: FAIL — `validateArticle` not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/lib/validators/article.ts
import type { Article } from '~/types/content'
import { ARTICLE_TYPE_OPTIONS } from '~/lib/field-options'
import { containsBase64 } from '~/lib/base64-guard'

export interface FieldError { field: string; message: string }

export function validateArticle(a: Article): FieldError[] {
  const errors: FieldError[] = []
  if (!a.title?.trim()) errors.push({ field: 'title', message: 'Title is required.' })
  if (!a.slug?.trim()) errors.push({ field: 'slug', message: 'Slug is required.' })
  if (!a.date) errors.push({ field: 'date', message: 'Date is required.' })
  if (a.type && !(ARTICLE_TYPE_OPTIONS as readonly string[]).includes(a.type)) {
    errors.push({ field: 'type', message: `Type must be one of: ${ARTICLE_TYPE_OPTIONS.join(', ')}.` })
  }
  if (a.images.some((img) => containsBase64(img.src))) {
    errors.push({ field: 'images', message: 'Images must reference a Media Library URL, never base64.' })
  }
  if (containsBase64(a.markdown)) {
    errors.push({ field: 'markdown', message: 'Embedded base64 images are not allowed; upload to the Media Library and use its URL.' })
  }
  return errors
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/validators.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/validators/article.ts tests/unit/validators.test.ts
git commit -m "feat(data): add article validator with zero-base64 gate"
```

---

### Task 8: App mapper + validator

**Files:**
- Create: `app/lib/mappers/app.ts`
- Create: `app/lib/validators/app.ts`
- Test: `tests/unit/mappers-app.test.ts`; extend `tests/unit/validators.test.ts`

**Interfaces:**
- Consumes: `App`, `AppWrite`, `Contributor` from `~/types/content`; strapi-rest helpers; `rawApp` fixture; `containsBase64`.
- Produces: `StrapiApp`, `appFromStrapi(raw): App`, `appToWrite(m: App): AppWrite`; `validateApp(a: App): FieldError[]`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/mappers-app.test.ts
import { describe, it, expect } from 'vitest'
import { appFromStrapi, appToWrite } from '~/lib/mappers/app'
import { rawApp } from '../fixtures/strapi'

describe('appFromStrapi / appToWrite', () => {
  const app = appFromStrapi(rawApp as never)
  it('maps image + relations + contributors', () => {
    expect(app.image).toEqual({ id: 1046, url: '/uploads/app_image_22cc0163e1.png', name: 'app-image.png', alternativeText: null, width: 720, height: 342, mime: 'image/png' })
    expect(app.contributors).toEqual([{ title: 'ICJIA R&A staff' }])
    expect(app.datasets).toEqual([{ documentId: 'dsdoc1', title: 'Crime Data', slug: 'crime-data' }])
  })
  it('writes image id and dataset documentId[]', () => {
    const w = appToWrite(app)
    expect(w.image).toBe(1046)
    expect(w.datasets).toEqual(['dsdoc1'])
  })
})
```

Add to `tests/unit/validators.test.ts`:

```ts
import { validateApp } from '~/lib/validators/app'
import type { App } from '~/types/content'

const baseApp = (over: Partial<App> = {}): App => ({
  documentId: '', title: 'A', slug: 'a', date: null, external: false,
  categories: [], tags: [], contributors: [], image: null, description: null,
  url: null, citation: null, funding: null, datasets: [], articles: [], publishedAt: null, ...over,
})

describe('validateApp', () => {
  it('requires a title', () => {
    expect(validateApp(baseApp({ title: '' }))).toContainEqual(expect.objectContaining({ field: 'title' }))
  })
  it('rejects base64 in the description', () => {
    expect(validateApp(baseApp({ description: 'data:image/png;base64,AAAA' })))
      .toContainEqual(expect.objectContaining({ field: 'description' }))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/mappers-app.test.ts tests/unit/validators.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/lib/mappers/app.ts
import type { App, AppWrite, Contributor } from '~/types/content'
import {
  mediaFromStrapi, mediaIdForWrite, relationsFromStrapi, relationsToWrite,
  type StrapiMedia, type StrapiRelation,
} from '~/lib/strapi-rest'

export interface StrapiApp {
  documentId: string; title: string; slug: string; date?: string | null; external?: boolean
  categories?: string[]; tags?: string[]; contributors?: Contributor[]
  image?: StrapiMedia | null; description?: string | null; url?: string | null
  citation?: string | null; funding?: string | null
  datasets?: StrapiRelation[]; articles?: StrapiRelation[]
  publishedAt?: string | null
}

export function appFromStrapi(raw: StrapiApp): App {
  return {
    documentId: raw.documentId,
    title: raw.title,
    slug: raw.slug,
    date: raw.date ?? null,
    external: raw.external ?? false,
    categories: raw.categories ?? [],
    tags: raw.tags ?? [],
    contributors: raw.contributors ?? [],
    image: mediaFromStrapi(raw.image),
    description: raw.description ?? null,
    url: raw.url ?? null,
    citation: raw.citation ?? null,
    funding: raw.funding ?? null,
    datasets: relationsFromStrapi(raw.datasets),
    articles: relationsFromStrapi(raw.articles),
    publishedAt: raw.publishedAt ?? null,
  }
}

export function appToWrite(m: App): AppWrite {
  return {
    title: m.title,
    slug: m.slug,
    date: m.date,
    external: m.external,
    categories: m.categories,
    tags: m.tags,
    contributors: m.contributors,
    image: mediaIdForWrite(m.image),
    description: m.description,
    url: m.url,
    citation: m.citation,
    funding: m.funding,
    datasets: relationsToWrite(m.datasets),
    articles: relationsToWrite(m.articles),
  }
}
```

```ts
// app/lib/validators/app.ts
import type { App } from '~/types/content'
import { containsBase64 } from '~/lib/base64-guard'
import type { FieldError } from '~/lib/validators/article'

export function validateApp(a: App): FieldError[] {
  const errors: FieldError[] = []
  if (!a.title?.trim()) errors.push({ field: 'title', message: 'Title is required.' })
  if (!a.slug?.trim()) errors.push({ field: 'slug', message: 'Slug is required.' })
  if (a.description && containsBase64(a.description)) {
    errors.push({ field: 'description', message: 'Embedded base64 images are not allowed; use a Media Library URL.' })
  }
  return errors
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/mappers-app.test.ts tests/unit/validators.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/lib/mappers/app.ts app/lib/validators/app.ts tests/unit/mappers-app.test.ts tests/unit/validators.test.ts
git commit -m "feat(data): add app mapper + validator"
```

---

### Task 9: Dataset mapper + validator

**Files:**
- Create: `app/lib/mappers/dataset.ts`
- Create: `app/lib/validators/dataset.ts`
- Test: `tests/unit/mappers-dataset.test.ts`; extend `tests/unit/validators.test.ts`

**Interfaces:**
- Consumes: `Dataset`, `DatasetWrite`, `Source`, `Variable`, `TimePeriod` from `~/types/content`; strapi-rest helpers; `rawDataset` fixture; `containsBase64`.
- Produces: `StrapiDataset`, `datasetFromStrapi(raw): Dataset`, `datasetToWrite(m: Dataset): DatasetWrite`; `validateDataset(d: Dataset): FieldError[]`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/mappers-dataset.test.ts
import { describe, it, expect } from 'vitest'
import { datasetFromStrapi, datasetToWrite } from '~/lib/mappers/dataset'
import { rawDataset } from '../fixtures/strapi'

describe('datasetFromStrapi / datasetToWrite', () => {
  const ds = datasetFromStrapi(rawDataset as never)
  it('maps datafile, timeperiod, sources, variables, notes', () => {
    expect(ds.datafile).toEqual({ id: 99, url: '/uploads/crime_abc.csv', name: 'crime.csv', alternativeText: null, width: null, height: null, mime: 'text/csv' })
    expect(ds.timeperiod).toEqual({ yeartype: 'calendar', yearmin: 1982, yearmax: 2020 })
    expect(ds.sources).toEqual([{ title: 'UCR, Illinois State Police', url: 'https://isp.illinois.gov/x' }])
    expect(ds.variables[0]).toEqual({ name: 'Year', type: 'integer', definition: 'The year events occurred.' })
    expect(ds.notes).toEqual(['Counties may not add up to the state total.'])
  })
  it('writes datafile id and app documentId[]', () => {
    const w = datasetToWrite(ds)
    expect(w.datafile).toBe(99)
    expect(w.apps).toEqual(['appdoc1'])
    expect(w.timeperiod).toEqual({ yeartype: 'calendar', yearmin: 1982, yearmax: 2020 })
  })
})
```

Add to `tests/unit/validators.test.ts`:

```ts
import { validateDataset } from '~/lib/validators/dataset'
import type { Dataset } from '~/types/content'

const baseDataset = (over: Partial<Dataset> = {}): Dataset => ({
  documentId: '', title: 'D', slug: 'd', date: '2020-01-01', external: false, project: false,
  categories: [], tags: [], sources: [], unit: null, timeperiod: null, description: null,
  notes: [], variables: [], citation: null, funding: null, datafile: null,
  apps: [], articles: [], publishedAt: null, ...over,
})

describe('validateDataset', () => {
  it('requires title and date', () => {
    expect(validateDataset(baseDataset({ title: '', date: null })).map((e) => e.field).sort())
      .toEqual(['date', 'title'])
  })
  it('rejects an unknown unit', () => {
    expect(validateDataset(baseDataset({ unit: 'galactic' }))).toContainEqual(expect.objectContaining({ field: 'unit' }))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/mappers-dataset.test.ts tests/unit/validators.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/lib/mappers/dataset.ts
import type { Dataset, DatasetWrite, Source, Variable, TimePeriod } from '~/types/content'
import {
  mediaFromStrapi, mediaIdForWrite, relationsFromStrapi, relationsToWrite,
  type StrapiMedia, type StrapiRelation,
} from '~/lib/strapi-rest'

export interface StrapiDataset {
  documentId: string; title: string; slug: string; date: string | null; external?: boolean
  project?: boolean; categories?: string[]; tags?: string[]
  sources?: Source[]; unit?: string | null; timeperiod?: TimePeriod | null
  description?: string | null; notes?: string[]; variables?: Variable[]
  citation?: string | null; funding?: string | null
  datafile?: StrapiMedia | null; apps?: StrapiRelation[]; articles?: StrapiRelation[]
  publishedAt?: string | null
}

export function datasetFromStrapi(raw: StrapiDataset): Dataset {
  return {
    documentId: raw.documentId,
    title: raw.title,
    slug: raw.slug,
    date: raw.date ?? null,
    external: raw.external ?? false,
    project: raw.project ?? false,
    categories: raw.categories ?? [],
    tags: raw.tags ?? [],
    sources: raw.sources ?? [],
    unit: raw.unit ?? null,
    timeperiod: raw.timeperiod ?? null,
    description: raw.description ?? null,
    notes: raw.notes ?? [],
    variables: raw.variables ?? [],
    citation: raw.citation ?? null,
    funding: raw.funding ?? null,
    datafile: mediaFromStrapi(raw.datafile),
    apps: relationsFromStrapi(raw.apps),
    articles: relationsFromStrapi(raw.articles),
    publishedAt: raw.publishedAt ?? null,
  }
}

export function datasetToWrite(m: Dataset): DatasetWrite {
  return {
    title: m.title,
    slug: m.slug,
    date: m.date,
    external: m.external,
    project: m.project,
    categories: m.categories,
    tags: m.tags,
    sources: m.sources,
    unit: m.unit,
    timeperiod: m.timeperiod,
    description: m.description,
    notes: m.notes,
    variables: m.variables,
    citation: m.citation,
    funding: m.funding,
    datafile: mediaIdForWrite(m.datafile),
    apps: relationsToWrite(m.apps),
    articles: relationsToWrite(m.articles),
  }
}
```

```ts
// app/lib/validators/dataset.ts
import type { Dataset } from '~/types/content'
import { UNIT_OPTIONS, TIMEPERIOD_TYPE_OPTIONS } from '~/lib/field-options'
import { containsBase64 } from '~/lib/base64-guard'
import type { FieldError } from '~/lib/validators/article'

export function validateDataset(d: Dataset): FieldError[] {
  const errors: FieldError[] = []
  if (!d.title?.trim()) errors.push({ field: 'title', message: 'Title is required.' })
  if (!d.slug?.trim()) errors.push({ field: 'slug', message: 'Slug is required.' })
  if (!d.date) errors.push({ field: 'date', message: 'Date is required.' })
  if (d.unit && !(UNIT_OPTIONS as readonly string[]).includes(d.unit)) {
    errors.push({ field: 'unit', message: `Unit must be one of: ${UNIT_OPTIONS.join(', ')}.` })
  }
  if (d.timeperiod && !(TIMEPERIOD_TYPE_OPTIONS as readonly string[]).includes(d.timeperiod.yeartype)) {
    errors.push({ field: 'timeperiod', message: `Time-period type must be one of: ${TIMEPERIOD_TYPE_OPTIONS.join(', ')}.` })
  }
  if (d.description && containsBase64(d.description)) {
    errors.push({ field: 'description', message: 'Embedded base64 images are not allowed; use a Media Library URL.' })
  }
  return errors
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/mappers-dataset.test.ts tests/unit/validators.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/lib/mappers/dataset.ts app/lib/validators/dataset.ts tests/unit/mappers-dataset.test.ts tests/unit/validators.test.ts
git commit -m "feat(data): add dataset mapper + validator"
```

---

### Task 10: Generic repository factory

**Files:**
- Create: `app/lib/repository.ts`
- Test: `tests/unit/repository.test.ts`

**Interfaces:**
- Consumes: `$Fetch` (ofetch); `unwrapList`, `unwrapOne`, `StrapiListResponse`, `StrapiSingleResponse` from `~/lib/strapi-rest`; `ContentStatus` from `~/types/content`.
- Produces: `ListOptions`, `WriteOptions`, `Repository<TDomain>`, `RepositoryConfig<TRaw, TDomain, TWrite>`, `createRepository(cfg): Repository<TDomain>`.

*Endpoints (Strapi 5 REST): `GET /api/{plural}` (list, `?status=`), `GET /api/{plural}/{documentId}` (findOne, `?status=&populate=`), `POST /api/{plural}` (create, body `{data}`), `PUT /api/{plural}/{documentId}` (update, body `{data}`), `DELETE /api/{plural}/{documentId}` (remove).*

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/repository.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createRepository } from '~/lib/repository'
import type { $Fetch } from 'ofetch'

interface Raw { documentId: string; title: string }
interface Dom { documentId: string; title: string; loud: string }
const fromStrapi = (r: Raw): Dom => ({ ...r, loud: r.title.toUpperCase() })
const toWrite = (d: Dom) => ({ title: d.title })

const makeRepo = (api: $Fetch) =>
  createRepository<Raw, Dom, { title: string }>({ api, plural: 'articles', populate: '*', fromStrapi, toWrite })

describe('createRepository', () => {
  it('list() GETs the collection with status and maps each row', async () => {
    const api = vi.fn().mockResolvedValue({ data: [{ documentId: 'a', title: 'x' }], meta: { pagination: {} } }) as unknown as $Fetch
    const out = await makeRepo(api).list({ status: 'draft' })
    expect(api).toHaveBeenCalledWith('/api/articles', expect.objectContaining({ query: expect.objectContaining({ status: 'draft' }) }))
    expect(out).toEqual([{ documentId: 'a', title: 'x', loud: 'X' }])
  })

  it('findOne() GETs by documentId with populate and maps', async () => {
    const api = vi.fn().mockResolvedValue({ data: { documentId: 'a', title: 'x' }, meta: {} }) as unknown as $Fetch
    const out = await makeRepo(api).findOne('a', { status: 'draft' })
    expect(api).toHaveBeenCalledWith('/api/articles/a', expect.objectContaining({ query: expect.objectContaining({ populate: '*', status: 'draft' }) }))
    expect(out.loud).toBe('X')
  })

  it('create() POSTs a {data} body produced by toWrite', async () => {
    const api = vi.fn().mockResolvedValue({ data: { documentId: 'a', title: 'x' }, meta: {} }) as unknown as $Fetch
    await makeRepo(api).create({ documentId: '', title: 'x', loud: 'X' })
    expect(api).toHaveBeenCalledWith('/api/articles', expect.objectContaining({ method: 'POST', body: { data: { title: 'x' } } }))
  })

  it('update() PUTs to /{documentId} with a {data} body', async () => {
    const api = vi.fn().mockResolvedValue({ data: { documentId: 'a', title: 'y' }, meta: {} }) as unknown as $Fetch
    await makeRepo(api).update('a', { documentId: 'a', title: 'y', loud: 'Y' })
    expect(api).toHaveBeenCalledWith('/api/articles/a', expect.objectContaining({ method: 'PUT', body: { data: { title: 'y' } } }))
  })

  it('remove() DELETEs by documentId', async () => {
    const api = vi.fn().mockResolvedValue(undefined) as unknown as $Fetch
    await makeRepo(api).remove('a')
    expect(api).toHaveBeenCalledWith('/api/articles/a', expect.objectContaining({ method: 'DELETE' }))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/repository.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/lib/repository.ts
import type { $Fetch } from 'ofetch'
import type { ContentStatus } from '~/types/content'
import {
  unwrapList, unwrapOne,
  type StrapiListResponse, type StrapiSingleResponse,
} from '~/lib/strapi-rest'

export interface ListOptions { status?: ContentStatus; page?: number; pageSize?: number; sort?: string }
export interface FindOptions { status?: ContentStatus }
export interface WriteOptions { status?: ContentStatus }

export interface Repository<TDomain> {
  list(opts?: ListOptions): Promise<TDomain[]>
  findOne(documentId: string, opts?: FindOptions): Promise<TDomain>
  create(model: TDomain, opts?: WriteOptions): Promise<TDomain>
  update(documentId: string, model: TDomain, opts?: WriteOptions): Promise<TDomain>
  remove(documentId: string): Promise<void>
}

export interface RepositoryConfig<TRaw, TDomain, TWrite> {
  api: $Fetch
  plural: string
  /** Strapi populate spec for findOne (default '*'). */
  populate?: string
  fromStrapi: (raw: TRaw) => TDomain
  toWrite: (model: TDomain) => TWrite
}

export function createRepository<TRaw, TDomain, TWrite>(
  cfg: RepositoryConfig<TRaw, TDomain, TWrite>,
): Repository<TDomain> {
  const base = `/api/${cfg.plural}`
  const populate = cfg.populate ?? '*'

  return {
    async list(opts = {}) {
      const res = await cfg.api<StrapiListResponse<TRaw>>(base, {
        query: {
          status: opts.status,
          'pagination[page]': opts.page,
          'pagination[pageSize]': opts.pageSize,
          sort: opts.sort,
        },
      })
      return unwrapList(res).map(cfg.fromStrapi)
    },

    async findOne(documentId, opts = {}) {
      const res = await cfg.api<StrapiSingleResponse<TRaw>>(`${base}/${documentId}`, {
        query: { populate, status: opts.status },
      })
      return cfg.fromStrapi(unwrapOne(res))
    },

    async create(model, opts = {}) {
      const res = await cfg.api<StrapiSingleResponse<TRaw>>(base, {
        method: 'POST',
        query: { status: opts.status },
        body: { data: cfg.toWrite(model) },
      })
      return cfg.fromStrapi(unwrapOne(res))
    },

    async update(documentId, model, opts = {}) {
      const res = await cfg.api<StrapiSingleResponse<TRaw>>(`${base}/${documentId}`, {
        method: 'PUT',
        query: { status: opts.status },
        body: { data: cfg.toWrite(model) },
      })
      return cfg.fromStrapi(unwrapOne(res))
    },

    async remove(documentId) {
      await cfg.api(`${base}/${documentId}`, { method: 'DELETE' })
    },
  }
}
```

*Note: `ofetch` omits `query` keys whose value is `undefined`, so unset options produce a clean URL.*

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/repository.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/repository.ts tests/unit/repository.test.ts
git commit -m "feat(data): add generic documentId repository factory"
```

---

### Task 11: Per-type repositories + composables

**Files:**
- Create: `app/repositories/articles.ts`, `app/repositories/apps.ts`, `app/repositories/datasets.ts`
- Create: `app/composables/useArticles.ts`, `app/composables/useApps.ts`, `app/composables/useDatasets.ts`
- Test: `tests/unit/repositories.test.ts`

**Interfaces:**
- Consumes: `createRepository` (Task 10); mappers (Tasks 6/8/9); raw types `StrapiArticle`/`StrapiApp`/`StrapiDataset`; domain types.
- Produces: `createArticlesRepository(api): Repository<Article>`, `createAppsRepository(api): Repository<App>`, `createDatasetsRepository(api): Repository<Dataset>`; composables `useArticles()`, `useApps()`, `useDatasets()` returning the bound repository.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/repositories.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createArticlesRepository } from '~/repositories/articles'
import { createAppsRepository } from '~/repositories/apps'
import { createDatasetsRepository } from '~/repositories/datasets'
import { rawArticle, rawApp, rawDataset } from '../fixtures/strapi'
import type { $Fetch } from 'ofetch'

describe('per-type repositories', () => {
  it('articles repo hits /api/articles and maps via articleFromStrapi', async () => {
    const api = vi.fn().mockResolvedValue({ data: rawArticle, meta: {} }) as unknown as $Fetch
    const a = await createArticlesRepository(api).findOne('igo619j501vpj10sg8ecfv74')
    expect(api).toHaveBeenCalledWith('/api/articles/igo619j501vpj10sg8ecfv74', expect.objectContaining({ query: expect.objectContaining({ populate: '*' }) }))
    expect(a.splash?.id).toBe(10)
    expect(a.datasets[0].documentId).toBe('dsdoc1')
  })

  it('apps repo hits /api/apps and maps contributors', async () => {
    const api = vi.fn().mockResolvedValue({ data: [rawApp], meta: { pagination: {} } }) as unknown as $Fetch
    const [app] = await createAppsRepository(api).list({ status: 'published' })
    expect(api).toHaveBeenCalledWith('/api/apps', expect.anything())
    expect(app.contributors).toEqual([{ title: 'ICJIA R&A staff' }])
  })

  it('datasets repo hits /api/datasets and maps timeperiod', async () => {
    const api = vi.fn().mockResolvedValue({ data: rawDataset, meta: {} }) as unknown as $Fetch
    const ds = await createDatasetsRepository(api).findOne('dsdoc1')
    expect(api).toHaveBeenCalledWith('/api/datasets/dsdoc1', expect.anything())
    expect(ds.timeperiod).toEqual({ yeartype: 'calendar', yearmin: 1982, yearmax: 2020 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/repositories.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/repositories/articles.ts
import type { $Fetch } from 'ofetch'
import { createRepository, type Repository } from '~/lib/repository'
import { articleFromStrapi, articleToWrite, type StrapiArticle } from '~/lib/mappers/article'
import type { Article, ArticleWrite } from '~/types/content'

export function createArticlesRepository(api: $Fetch): Repository<Article> {
  return createRepository<StrapiArticle, Article, ArticleWrite>({
    api, plural: 'articles', populate: '*', fromStrapi: articleFromStrapi, toWrite: articleToWrite,
  })
}
```

```ts
// app/repositories/apps.ts
import type { $Fetch } from 'ofetch'
import { createRepository, type Repository } from '~/lib/repository'
import { appFromStrapi, appToWrite, type StrapiApp } from '~/lib/mappers/app'
import type { App, AppWrite } from '~/types/content'

export function createAppsRepository(api: $Fetch): Repository<App> {
  return createRepository<StrapiApp, App, AppWrite>({
    api, plural: 'apps', populate: '*', fromStrapi: appFromStrapi, toWrite: appToWrite,
  })
}
```

```ts
// app/repositories/datasets.ts
import type { $Fetch } from 'ofetch'
import { createRepository, type Repository } from '~/lib/repository'
import { datasetFromStrapi, datasetToWrite, type StrapiDataset } from '~/lib/mappers/dataset'
import type { Dataset, DatasetWrite } from '~/types/content'

export function createDatasetsRepository(api: $Fetch): Repository<Dataset> {
  return createRepository<StrapiDataset, Dataset, DatasetWrite>({
    api, plural: 'datasets', populate: '*', fromStrapi: datasetFromStrapi, toWrite: datasetToWrite,
  })
}
```

```ts
// app/composables/useArticles.ts
import { createArticlesRepository } from '~/repositories/articles'

/** Articles data access, bound to the configured $api client. */
export function useArticles() {
  const { $api } = useNuxtApp()
  return createArticlesRepository($api)
}
```

```ts
// app/composables/useApps.ts
import { createAppsRepository } from '~/repositories/apps'

export function useApps() {
  const { $api } = useNuxtApp()
  return createAppsRepository($api)
}
```

```ts
// app/composables/useDatasets.ts
import { createDatasetsRepository } from '~/repositories/datasets'

export function useDatasets() {
  const { $api } = useNuxtApp()
  return createDatasetsRepository($api)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/repositories.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full suite + typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: all tests pass (Task 1 baseline 28 + this plan's additions); typecheck exit 0.

- [ ] **Step 6: Commit**

```bash
git add app/repositories app/composables/useArticles.ts app/composables/useApps.ts app/composables/useDatasets.ts tests/unit/repositories.test.ts
git commit -m "feat(data): add per-type repositories and composables"
```

---

## Post-plan verification (user-gated)

These are **not** unit-testable offline and require a real Users & Permissions login token, so they run as a controlled manual check after the plan lands — they do **not** block merge:

1. **Live read smoke (dev instance):** with the dev server running, in the browser console after dev-admin login, call `await useArticles().findOne('<a real documentId>')` and confirm a mapped `Article` (correct `splash.url`, `datasets[].documentId`). Read endpoints are public, so this works without a token.
2. **Live write smoke (needs a real U&P token):** with a real `author`/`admin` U&P user logged in (the dev-admin bypass mints a synthetic token Strapi rejects, so it cannot exercise writes), `create` a throwaway draft, confirm `publishedAt: null`, then `remove` it. **Target the dev Strapi 5 only.** Requires the user to provide/confirm a U&P test user — see Open items.
3. **Zero-base64 end-to-end:** confirm `validateArticle` blocks a payload whose `markdown`/`images[].src` carries a `data:` URI before any write is attempted.

## Open items carried into later plans

- **U&P test user** (`author` + `admin`) for live write/publish verification — user-provided; never created by the implementer (no Strapi changes without approval).
- **Confirm role names** (`author`/`admin`) against the dev instance (design spec §14 #1).
- **Media upload** that mints the numeric file `id` consumed by `*ToWrite` mappers — Plan 3 (media & zero-base64).
- **Publish/unpublish** writes (`?status=published`) + Netlify build-hook proxy — Plan 6.
- **List populate narrowing** (lists currently rely on no populate; `findOne` uses `populate=*`) — optimize when building views (Plan 5).

## Self-review (performed against the design spec)

- **Spec coverage:** §5 data model → types (Task 4) + mappers (6/8/9); §5.4 typed models/mappers → Tasks 4/6/8/9; §7 zero-base64 → Task 3 + validator gates (7/8/9); §10 validation/parsing → slug (Task 2), text-import (Task 5), validators (7/8/9); §4 REST contract (documentId, status, `{data}`, media-by-id, relations-by-documentId) → strapi-rest (Task 4) + repository (Task 10/11). Media *upload* (§4 two-step) is correctly deferred to Plan 3; this layer only consumes the numeric id.
- **Placeholder scan:** none — every step ships real code and exact commands.
- **Type consistency:** `MediaRef`/`RelationRef`/`FieldError` and the `*FromStrapi`/`*ToWrite` names are used identically across Tasks 4→11; `createRepository` signature matches its callers in Task 11; `FieldError` is defined once (Task 7) and imported by Tasks 8/9.

---

**Plan complete.** Eleven TDD tasks producing a tested, typed, `documentId`-addressed data layer for articles, apps, and datasets — with the zero-base64 rule enforced by tests.
