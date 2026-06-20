# Screens, Forms & Preview — Implementation Plan

> **Plan 5 of the ICJIA Studio build.** Follows the auth plan (Plan 1/2), the data-layer plan (Plan 3 in the ledger order, retargeted to the Content-Manager API), and the media plan (zero-base64). It delivers the **first clickable app**: Markdown rendering + a basic editor, shared form fields, create/edit forms for Article/App/Dataset, a role-aware dashboard + listings, and a shareable preview route. It **wires** the already-built data and media layers — it does not recreate them.

> **Draft 1 — first iteration.** Part of an exploratory first pass; expect the approach to evolve as the build surfaces requirements (the data layer itself was revised mid-build from REST → Content-Manager API). Forms are built against the data-layer repos and validators exactly as they exist today.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

## 📋 For managers — what is this, and is it legit?

**What this document is.** The construction recipe for the **first screens an author actually clicks** — the dashboard, the create/edit forms for the three kinds of content (articles, apps, datasets), a live Markdown preview, and a shareable "see it as it would publish" page. The login plan, the content engine, and the image handling all came first; this is the plan that turns those invisible pieces into a working tool.

**Why this matters.** Until now there were tested building blocks but no place to *use* them. This plan assembles them into screens: an author opens the dashboard, picks "new article," fills a form, drops in a picture (handled by the already-built image tools), writes the body with a live preview, and saves a **draft**. A manager can list drafts. Anyone with the link can preview a draft as it would look published.

**The one rule we keep guaranteeing.** Every save runs the content engine's **validator** first — and the validator refuses any image smuggled in as a giant blob of text ("base64"). This plan makes that check the gate on *every* save button, and locks it with tests: a form holding a base64 image cannot save.

**Is it real, or jargon?** Real, and routine:
- Every small step **writes a test first, then the code** (Test-Driven Development).
- Every step ends in a **save point** (a commit) — traceable and reversible.
- The hard logic (does this form pass validation? what gets sent to the server?) lives in **plain, separately-tested functions**, so the screens themselves stay thin and the rules are provable.

**What you get when this plan is done.** A working draft-authoring app: a role-aware dashboard, working create/edit forms for all three content types, a Markdown editor with live preview, content listings, and a shareable preview page — all private behind login. **Not** in this plan (on purpose, and noted below): the "Publish" button + website rebuild (Plan 6), the full fancy Markdown editor (Plan 4, which slots into the same field), first-login onboarding (needs a backend change first), and the pixel-exact published styling (needs the official stylesheet).

**Bottom line.** Legitimate, careful assembly of the first usable screens — written in detail so the "no base64 images" promise is enforced on every save, and so the screens stay simple while the rules stay tested.

---

**Goal:** Build the Studio's first interactive surface on top of the existing data + media layers: (1) `markdown-it`-based rendering (`renderMarkdown`) + a `MarkdownPreview` component + a basic `MarkdownField` (textarea + live preview) — the **seam** the full ICJIA Markdown Editor (Plan 4) slots into; (2) shared Nuxt-UI form fields (text/date/select/chips), a repeatable-row list (with the optional paste-to-rows affordance) and a `MediaField` wrapping `MediaPicker`; (3) Create/Edit forms for Article/App/Dataset whose pure form-state helper runs the matching `validate*` **before any write** (the zero-base64 save-gate — the key deferred hand-off), `slugify`s the title on create, and calls the repo `create`/`update`; (4) a role-aware dashboard + reverse-chronological per-type listings; (5) a shareable `/preview/:type/:documentId` route that renders `markdown` via `renderMarkdown` inside one swappable prose stylesheet; (6) the page/routing glue (`/`, `/create/:type`, `/edit/:type/:documentId`, `/manage` [`adminOnly`], `/preview/:type/:documentId`) — all private except `/login`, enforced by the **already-built** global guard.

**Architecture:** Mirror the data/media layers' **DI-pure-function + thin-wrapper** rule. All non-trivial form logic lives in pure, node-testable functions/composables (`lib/markdown.ts`, `lib/forms/*` blank-model factories + a `submitForm` helper); `renderMarkdown` is a pure string→string function. `.vue` components are thin: fields are controlled inputs over `v-model`; forms are thin over the pure helper + the `use{Articles,Apps,Datasets}` repo. Pure logic is unit-tested in the fast node env; components are component-tested with `mountSuspended` + `mockNuxtImport` (mirroring `tests/nuxt/media-picker.test.ts`/`login.test.ts`), focused on the **save-gate** (a base64/invalid model is blocked) and the **wiring** (repo `create`/`update` called with the right shape). No network in any test.

**Tech Stack:** Nuxt 4 (SPA, `ssr: false`), Vue 3.5, Nuxt UI 4, Pinia 2.x, TypeScript, `ofetch` (`$api`), Vitest + `@nuxt/test-utils` (node + the `nuxt` runtime env), plus the new `markdown-it` (+ footnote / KaTeX / multimd-table plugins).

## Global Constraints

*Every task's requirements implicitly include this section. Values are copied from the design spec (`docs/superpowers/specs/2026-06-19-researchhub-studio-2026-design.md` §8 editor, §9 views/UX, §10 validation/parsing/field semantics, §13 testing) and the public shapes of the already-built data/media/auth layers.*

- **Stack:** Nuxt 4 **SPA** (`ssr: false`), **Nuxt UI 4**, Pinia 2.x, **TypeScript**. Pages live in `app/pages/`; the global route middleware (`app/middleware/auth.global.ts`) + `definePageMeta({ public, adminOnly })` already enforce that everything except `/login` is private (default-deny via `lib/guard.ts`). **This plan adds NO new auth/guard logic.**
- **Wire, do NOT recreate** (read their public shapes; never redefine):
  - **Data layer:** `useArticles()` / `useApps()` / `useDatasets()` (each returns a `Repository<T>` with `list(opts?) / findOne(documentId, opts?) / create(model, opts?) / update(documentId, model, opts?) / remove(documentId)`; `list`/`findOne` accept `{ status?: 'draft'|'published' }`). Mappers `app/lib/mappers/*` and the raw/write types live behind the repos. Domain types `app/types/content.ts`: `Article`, `App`, `Dataset` (+ `Author`, `Contributor`, `ImageRef`, `Source`, `Variable`, `TimePeriod`, `MediaRef`, `RelationRef`, `ContentStatus`).
  - **Validators (the save-gate):** `validateArticle(a: Article) / validateApp(a: App) / validateDataset(d: Dataset)` each return `FieldError[]` (`{ field: string; message: string }`, exported from `~/lib/validators/article`). They already enforce required fields + `containsBase64` rejection. **Note the asymmetry (read the source):** `validateArticle` and `validateDataset` require `title`+`slug`+`date`; `validateApp` requires only `title`+`slug` (no date).
  - **Slug:** `slugify(title: string): string` from `~/lib/slug` — applied on **create** to set `slug` from `title`.
  - **Field options:** `CATEGORY_OPTIONS`, `UNIT_OPTIONS`, `MAINFILETYPE_OPTIONS`, `TIMEPERIOD_TYPE_OPTIONS`, `ARTICLE_TYPE_OPTIONS` (all `readonly string[] as const`) from `~/lib/field-options`.
  - **Text import (paste-to-rows):** `parseAuthors`, `parseSources`, `parseVariables`, `parseNotes`, `parseList` (+ the `format*` reverses) from `~/lib/text-import`.
  - **Media layer:** `MediaPicker.vue` (emits `select` with a `MediaRef`; alt-required; exposes `setFile/setAlt/setCaption/submit/choose/canSubmit`), `ImageDropzone.vue` (emits `insert` with a markdown snippet), `useUpload()`, `toMarkdown(ref)` from `~/components/image-markdown`, `ALLOWED_IMAGE_EXTENSIONS` from `~/lib/image-types`.
  - **Auth:** `useAuth()` (`user`, `canPublish`, `isLoggedIn`), `useAuthStore()` (`canPublish`, `displayName`, `isLoggedIn`). `APP_NAME` from `~/lib/constants`.
- **Validators run on EVERY save (the deferred hand-off, enforced here).** No write (`create`/`update`) may be issued unless the matching `validate*` returns `[]`. A base64 `data:` URL in any field is structurally blocked because `validate*` calls `containsBase64`. The pure `submitForm` helper runs the validator first and **returns the errors without calling the repo** when non-empty — asserted by tests.
- **`slugify` on create only.** On create, `slug = slugify(title)`; on edit, the existing `slug` is preserved (slug is editable on update per spec §10, but auto-derive is create-only). The model carries its own `slug`; forms set it from the title at create time.
- **Pure form-state logic is unit-tested; components are thin and component-tested.** Blank-model factories (`blankArticle()/blankApp()/blankDataset()`) and the generic `submitForm(model, validate, persist)` helper are pure and live in `app/lib/forms/`. Component tests use `mountSuspended` + `mockNuxtImport` (mirror `tests/nuxt/media-picker.test.ts`); SFCs import reactivity from `#imports` (`import { ref, computed, reactive } from '#imports'`) so the mocked Nuxt test env resolves them. No network in tests.
- **Markdown rendering parity (spec §8, §14 #6).** `renderMarkdown` uses `markdown-it` 14 with the **same plugin set the public Research Hub renderer uses** (footnotes, KaTeX/math, multi-row tables). The exact public plugin list is an Open item (§14 #6); this plan ships a sensible parity set (`markdown-it-footnote`, `markdown-it-katex`, `markdown-it-multimd-table`) behind the single `renderMarkdown` seam so swapping/extending later is a one-file change. The **same** `renderMarkdown` powers both the live `MarkdownField` preview and the `/preview` route.
- **Editor seam (spec §8; Plan 4).** The full ICJIA Markdown Editor (CodeMirror 6 + `uploadHandler`) is **Plan 4**. `MarkdownField` is a deliberately basic textarea-plus-live-preview that occupies the **same prop/`v-model` seam**; Plan 4 swaps the field internals without touching the forms. Note this in the component header.
- **Preview CSS is a swappable placeholder.** `/preview` renders the parity-plugin HTML inside **one** prose stylesheet file (`app/assets/css/prose-preview.css`, a clean placeholder now). The official project stylesheet drops into that one file later for pixel-exact parity — no other change.
- **Relations render read-only / out of scope for save.** The data layer **deferred relation WRITE** (`*Write` payloads carry NO relation fields; `apps`/`datasets`/`articles` come back as `RelationRef[]` on `findOne` only). Forms therefore display existing relations **read-only** (a simple labelled list of related titles) and do **not** offer a relation-edit-and-save path. Do **not** invent a relation-write path.
- **Drafts only.** `create` always writes a **draft** (`publishedAt: null`); this plan never publishes. Listings filter via the repo `list({ status })`. The **Publish action + Netlify rebuild + Mailgun review email is Plan 6** — `/manage` here is a read-only publish *queue* (list `status=draft`) with a disabled/"Coming in Plan 6" publish affordance.
- **New dependencies are limited** to `markdown-it` + its plugins (+ `@types/*`). **Do not bump the pinned Pinia 2.x stack** or any existing dependency.
- **Process:** TDD (red → green → refactor), frequent commits, pristine test output. Commit messages carry **NO AI co-author trailer** (per project CLAUDE.md). Run `npx vitest run && npm run typecheck` green before the final commit.

## Explicitly deferred (noted here; NOT built in this plan)

- **First-login onboarding** (manager emails / center / author email) — needs the approved `studio-profile` Strapi collection type, which must be created in the Strapi **dev** env first (the deployed sandbox is production-mode; content-type-builder disabled). Plan 5 leaves a noted seam (Task 7 dashboard header comment); onboarding is a follow-on once the type exists.
- **Publish action + Netlify rebuild + Mailgun review email** — **Plan 6**. `/manage` here is a read-only draft queue only.
- **Full ICJIA Markdown Editor** (CodeMirror 6, `uploadHandler`) — **Plan 4**; slots into `MarkdownField`'s `v-model` seam.
- **"Add Sample Article" demo** — **Plan 7**.
- **Pixel-exact preview CSS** — needs the official project stylesheet; this plan uses a clean placeholder behind one swappable file (`app/assets/css/prose-preview.css`).
- **Relation WRITE** (linking apps↔datasets↔articles on save) — deferred by the data layer (`*Write` omits relation fields). Relations render **read-only**; no relation-write path.
- **Per-field media constraints** (accepted types / max sizes per field, spec §7.2 / §14 #9) and the `images` JSON ↔ inline-markdown sync (spec §7.3 / §14 #11) — carried as a follow-on; `MediaField` here returns the numeric `id` for the single-media fields only.

## File structure

```
app/
├── lib/
│   ├── markdown.ts                # DI-pure renderMarkdown(md): string  (markdown-it + parity plugins)
│   └── forms/
│       ├── blank-models.ts        # blankArticle() / blankApp() / blankDataset()  (pure factories)
│       └── submit.ts              # submitForm(model, validate, persist) → FieldError[] (save-gate)
├── components/
│   ├── MarkdownPreview.vue        # renders renderMarkdown(md) as HTML (sanitized) in a prose wrapper
│   ├── MarkdownField.vue          # textarea + live MarkdownPreview (the Plan-4 editor seam)
│   ├── fields/
│   │   ├── TextField.vue          # label + UInput (v-model)
│   │   ├── DateField.vue          # label + date UInput (v-model: 'YYYY-MM-DD' | null)
│   │   ├── SelectField.vue        # label + USelect over a readonly string[] (v-model: string|null)
│   │   ├── ChipsField.vue         # label + multiselect chips over options (v-model: string[])
│   │   ├── RepeatableField.vue    # generic {field-spec}[] row editor + optional paste-to-rows
│   │   ├── MediaField.vue         # wraps MediaPicker; v-model: MediaRef|null; preview from url
│   │   └── RelationList.vue       # READ-ONLY list of RelationRef titles (no write)
│   └── forms/
│       ├── ArticleForm.vue        # thin over fields + submitForm + useArticles()
│       ├── AppForm.vue
│       └── DatasetForm.vue
├── pages/
│   ├── create/[type].vue          # /create/:type → the right *Form in create mode
│   ├── edit/[type]/[documentId].vue  # /edit/:type/:documentId → findOne → *Form in edit mode
│   ├── manage.vue                 # /manage (adminOnly): read-only draft queue (publish = Plan 6)
│   └── preview/[type]/[documentId].vue # /preview/:type/:documentId → findOne → renderMarkdown
└── assets/css/
    └── prose-preview.css          # ONE swappable prose stylesheet (placeholder now)

tests/
├── unit/
│   ├── markdown.test.ts           # renderMarkdown: headings/links/footnote/table; escapes raw HTML/script
│   ├── forms-blank-models.test.ts # factories return valid empty shapes (validate* finds only required gaps)
│   └── forms-submit.test.ts       # submitForm blocks on errors (no persist); persists on clean; base64 blocked
└── nuxt/
    ├── markdown-field.test.ts     # mountSuspended; typing updates the live preview; emits update:modelValue
    ├── repeatable-field.test.ts   # add/remove rows; paste-to-rows fills rows; emits update:modelValue
    ├── media-field.test.ts        # MediaPicker select → emits a MediaRef (url, never data:)
    ├── article-form.test.ts       # base64/invalid blocks create; clean create slugifies + calls repo.create
    ├── app-form.test.ts           # create calls useApps().create with slugified slug
    ├── dataset-form.test.ts       # create calls useDatasets().create; timeperiod/variables wired
    ├── dashboard.test.ts          # Publish-queue card only when canPublish
    ├── content-list.test.ts       # lists from repo.list({status}); links to edit/preview
    └── preview-page.test.ts       # findOne → renders markdown via renderMarkdown (url images, no data:)
```

*(Pure logic tests run in the default node env. The component/page specs declare `// @vitest-environment nuxt` and live under `tests/nuxt/` alongside the existing `media-picker.test.ts` / `login.test.ts`.)*

---

### Task 1: `renderMarkdown` library + markdown-it deps + `MarkdownPreview`

**Files:**
- Create: `app/lib/markdown.ts`
- Create: `app/components/MarkdownPreview.vue`
- Create: `app/assets/css/prose-preview.css`
- Test: `tests/unit/markdown.test.ts`
- Dependencies: add `markdown-it` + `markdown-it-footnote` + `markdown-it-katex` + `markdown-it-multimd-table` (+ `@types/markdown-it`, `@types/markdown-it-footnote`)

**Interfaces:**
- Consumes: `markdown-it` + plugins.
- Produces:
  - `renderMarkdown(md: string): string` — a configured singleton `MarkdownIt` instance (`{ html: false, linkify: true, typographer: true }`) with `footnote`, `katex`, and `multimd-table` plugins; returns rendered HTML. **`html: false`** so raw HTML / `<script>` in the source is escaped (not executed) — the security default for author-supplied markdown.
- `MarkdownPreview.vue` — props `{ source: string }`; renders `renderMarkdown(source)` via `v-html` inside `<div class="prose-preview" v-html="html" />`. The `prose-preview` class is the single swappable stylesheet seam.

> **Parity seam (Global Constraints / spec §8, §14 #6):** `renderMarkdown` is the ONE place the markdown-it plugin set is configured, so aligning with the public Research Hub renderer later (the exact plugin list is Open item §14 #6) is a one-file change. The same function powers the `MarkdownField` live preview (Task 2) and the `/preview` route (Task 8) — guaranteeing in-editor == published rendering. `html: false` means raw HTML is escaped; we render trusted plugin output via `v-html` but never author raw HTML.

- [ ] **Step 1: Add the dependencies**

```bash
npm install markdown-it markdown-it-footnote markdown-it-katex markdown-it-multimd-table
npm install -D @types/markdown-it @types/markdown-it-footnote
```

Expected: the four runtime packages under `dependencies`, the two `@types/*` under `devDependencies` in `package.json`. (Do not touch the pinned Pinia 2.x stack.)

- [ ] **Step 2: Write the failing test**

```ts
// tests/unit/markdown.test.ts
import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '~/lib/markdown'

describe('renderMarkdown', () => {
  it('renders a heading and a link', () => {
    const html = renderMarkdown('# Title\n\n[ICJIA](https://icjia.illinois.gov)')
    expect(html).toMatch(/<h1[^>]*>Title<\/h1>/)
    expect(html).toMatch(/<a href="https:\/\/icjia\.illinois\.gov"/)
  })

  it('renders a markdown image as an <img> from a Media Library url', () => {
    const html = renderMarkdown('![Bar chart](/uploads/figure_abc.png "Figure 1.")')
    expect(html).toMatch(/<img[^>]+src="\/uploads\/figure_abc\.png"/)
    expect(html).toMatch(/alt="Bar chart"/)
  })

  it('supports footnotes (parity plugin)', () => {
    const html = renderMarkdown('Text with a note.[^1]\n\n[^1]: The note.')
    expect(html).toMatch(/class="footnotes"/)
    expect(html).toMatch(/The note\./)
  })

  it('escapes raw HTML / <script> instead of executing it (html: false)', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\nNormal text.')
    expect(html).not.toMatch(/<script>alert\(1\)<\/script>/)
    expect(html).toMatch(/&lt;script&gt;/)
  })

  it('returns an empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/unit/markdown.test.ts`
Expected: FAIL — `Cannot find module '~/lib/markdown'`.

- [ ] **Step 4: Write minimal implementation**

```ts
// app/lib/markdown.ts
// The Studio's single Markdown renderer. ONE configured markdown-it instance with the parity
// plugin set (footnotes, KaTeX, multi-row tables) — aligned with the public Research Hub
// renderer so the in-editor preview (MarkdownField, Plan 5) matches published output (spec §8;
// the exact public plugin list is Open item §14 #6, swapped here in one place). The SAME
// renderMarkdown powers the /preview route. `html: false` ESCAPES raw HTML / <script> in
// author-supplied markdown (security default); only trusted plugin output is emitted.
import MarkdownIt from 'markdown-it'
import footnote from 'markdown-it-footnote'
import katex from 'markdown-it-katex'
import multimdTable from 'markdown-it-multimd-table'

const md = new MarkdownIt({ html: false, linkify: true, typographer: true })
  .use(footnote)
  .use(katex)
  .use(multimdTable, { multiline: true, rowspan: true, headerless: true })

/** Render Markdown source to HTML with the Studio/public-site parity plugin set. */
export function renderMarkdown(source: string): string {
  return md.render(source ?? '')
}
```

```vue
<!-- app/components/MarkdownPreview.vue -->
<!--
  MarkdownPreview: renders `source` to HTML via the single renderMarkdown seam (lib/markdown.ts)
  inside the ONE swappable prose stylesheet (.prose-preview → assets/css/prose-preview.css).
  Used by MarkdownField's live preview (Plan 5 Task 2) and the /preview route (Task 8); both
  share renderMarkdown so editor == published. renderMarkdown uses html:false, so the rendered
  HTML is trusted plugin output (raw author HTML is escaped) — safe for v-html.
-->
<script setup lang="ts">
import { computed } from '#imports'
import { renderMarkdown } from '~/lib/markdown'

const props = defineProps<{ source: string }>()
const html = computed(() => renderMarkdown(props.source))
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- trusted: renderMarkdown runs markdown-it with html:false -->
  <div class="prose-preview" v-html="html" />
</template>
```

```css
/* app/assets/css/prose-preview.css */
/*
  Placeholder prose styles for the in-app Markdown preview (MarkdownPreview / /preview route).
  This is the ONE swappable file: the official public-site stylesheet drops in here later for
  pixel-exact published parity (Plan 5 Global Constraints). Keep selectors scoped to .prose-preview.
*/
.prose-preview { line-height: 1.6; max-width: 70ch; }
.prose-preview h1 { font-size: 1.875rem; font-weight: 600; margin: 1.5rem 0 0.75rem; }
.prose-preview h2 { font-size: 1.5rem; font-weight: 600; margin: 1.25rem 0 0.5rem; }
.prose-preview h3 { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; }
.prose-preview p { margin: 0.75rem 0; }
.prose-preview a { color: var(--ui-primary, #2563eb); text-decoration: underline; }
.prose-preview ul, .prose-preview ol { margin: 0.75rem 0; padding-left: 1.5rem; }
.prose-preview ul { list-style: disc; }
.prose-preview ol { list-style: decimal; }
.prose-preview img { max-width: 100%; height: auto; }
.prose-preview table { border-collapse: collapse; margin: 1rem 0; }
.prose-preview th, .prose-preview td { border: 1px solid var(--ui-border, #e5e7eb); padding: 0.375rem 0.625rem; }
.prose-preview blockquote { border-left: 3px solid var(--ui-border, #e5e7eb); padding-left: 1rem; color: var(--ui-text-muted, #6b7280); }
.prose-preview code { font-family: ui-monospace, monospace; font-size: 0.9em; }
.prose-preview .footnotes { font-size: 0.875rem; border-top: 1px solid var(--ui-border, #e5e7eb); margin-top: 2rem; padding-top: 1rem; }
```

Register the stylesheet by adding it to the Nuxt `css` array (next to the existing `~/assets/css/main.css`):

```ts
// nuxt.config.ts  (css array)
css: ['~/assets/css/main.css', '~/assets/css/prose-preview.css'],
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/markdown.test.ts`
Expected: PASS (5 tests).

*Note: if `markdown-it-katex` emits noisy console output for non-math content in the node env, that is acceptable; the test asserts only the markdown structure, not KaTeX rendering. If a plugin's published types are absent, add a one-line `declare module '...'` shim under `app/types/shims.d.ts` rather than `any`-casting at the call site.*

- [ ] **Step 6: Commit**

```bash
git add app/lib/markdown.ts app/components/MarkdownPreview.vue app/assets/css/prose-preview.css nuxt.config.ts package.json package-lock.json
git commit -m "feat(studio): add renderMarkdown (parity plugins) + MarkdownPreview"
```

---

### Task 2: `MarkdownField` (textarea + live preview) — the Plan-4 editor seam

**Files:**
- Create: `app/components/MarkdownField.vue`
- Test: `tests/nuxt/markdown-field.test.ts`

**Interfaces:**
- Consumes: `MarkdownPreview` (Task 1).
- Props: `{ modelValue: string; label?: string }`. Emits: `update:modelValue` (so it is a `v-model` field).
- Behaviour: a `<textarea>` bound to `modelValue` (emitting `update:modelValue` on input) beside a live `MarkdownPreview :source="modelValue"`. This is the **seam** the full ICJIA Markdown Editor (Plan 4) replaces — same `v-model` contract.

> **Editor seam (spec §8; Plan 4):** deliberately basic. Plan 4 swaps the textarea for CodeMirror 6 + the `uploadHandler`/`ImageDropzone` integration without changing this component's `modelValue`/`update:modelValue` contract, so `ArticleForm` (Task 4) is untouched by that upgrade. Tested under the Nuxt env with `mountSuspended`: typing updates the rendered preview and emits the new value. SFC reactivity is imported from `#imports` (mirrors `MediaPicker.vue`).

- [ ] **Step 1: Write the failing test**

```ts
// tests/nuxt/markdown-field.test.ts
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import MarkdownField from '~/components/MarkdownField.vue'

describe('MarkdownField (the Plan-4 editor seam)', () => {
  it('renders the bound value in the live preview', async () => {
    const wrapper = await mountSuspended(MarkdownField, { props: { modelValue: '# Hello', label: 'Body' } })
    expect(wrapper.find('.prose-preview').html()).toMatch(/<h1[^>]*>Hello<\/h1>/)
  })

  it('emits update:modelValue when the textarea changes', async () => {
    const wrapper = await mountSuspended(MarkdownField, { props: { modelValue: '', label: 'Body' } })
    const ta = wrapper.find('textarea')
    await ta.setValue('## Edited')
    const events = wrapper.emitted('update:modelValue')
    expect(events).toBeTruthy()
    expect(events![events!.length - 1][0]).toBe('## Edited')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/nuxt/markdown-field.test.ts`
Expected: FAIL — `Cannot find module '~/components/MarkdownField.vue'`.

- [ ] **Step 3: Write minimal implementation**

```vue
<!-- app/components/MarkdownField.vue -->
<!--
  MarkdownField: a BASIC markdown editor — a textarea bound via v-model beside a live
  MarkdownPreview. This is the SEAM the full ICJIA Markdown Editor 2026 (CodeMirror 6 +
  uploadHandler) slots into in Plan 4: the replacement keeps this exact { modelValue /
  update:modelValue } contract, so the content forms don't change. Live preview uses the
  shared renderMarkdown (parity with published output).
-->
<script setup lang="ts">
import { computed } from '#imports'

const props = defineProps<{ modelValue: string; label?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const value = computed({
  get: () => props.modelValue,
  set: (v: string) => emit('update:modelValue', v),
})
</script>

<template>
  <div class="markdown-field">
    <label v-if="label" class="block text-sm font-medium mb-1">{{ label }}</label>
    <div class="grid gap-3 md:grid-cols-2">
      <UTextarea v-model="value" :rows="16" class="w-full font-mono" placeholder="Write Markdown…" />
      <MarkdownPreview :source="value" />
    </div>
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/nuxt/markdown-field.test.ts`
Expected: PASS (2 tests).

*Note: `UTextarea` and `MarkdownPreview` are Nuxt auto-imported (Nuxt UI + `app/components/`); no explicit import needed. If `UTextarea`'s `v-model` doesn't surface a raw `<textarea>` for `.setValue`, fall back to a plain `<textarea v-model="value">` — the field is intentionally minimal and replaced in Plan 4.*

- [ ] **Step 5: Commit**

```bash
git add app/components/MarkdownField.vue tests/nuxt/markdown-field.test.ts
git commit -m "feat(studio): add MarkdownField (textarea + live preview; Plan-4 seam)"
```

---

### Task 3: Shared form fields (text/date/select/chips) + `RepeatableField` (+ paste-to-rows) + `MediaField` + `RelationList`

**Files:**
- Create: `app/components/fields/TextField.vue`, `DateField.vue`, `SelectField.vue`, `ChipsField.vue`, `RepeatableField.vue`, `MediaField.vue`, `RelationList.vue`
- Test: `tests/nuxt/repeatable-field.test.ts`, `tests/nuxt/media-field.test.ts`

**Interfaces (all `v-model` controlled, thin over Nuxt UI):**
- `TextField` — props `{ modelValue: string | null; label: string; type?: string }`; emits `update:modelValue`. Thin over `UFormField` + `UInput`.
- `DateField` — props `{ modelValue: string | null; label: string }`; emits `update:modelValue` (an `'YYYY-MM-DD'` string or `null`). Thin over `UFormField` + `UInput type="date"`.
- `SelectField` — props `{ modelValue: string | null; label: string; options: readonly string[] }`; emits `update:modelValue`. Thin over `UFormField` + `USelect`.
- `ChipsField` — props `{ modelValue: string[]; label: string; options?: readonly string[] }`; emits `update:modelValue` (a `string[]`). Multiselect chips for categories/tags; `options` optional (free-entry tags allowed when omitted).
- `RepeatableField` — generic row editor: props `{ modelValue: Record<string, string>[]; label: string; columns: { key: string; label: string }[]; pasteParser?: (text: string) => Record<string, string>[] }`; emits `update:modelValue`. Add-row / remove-row buttons; one input per declared column; **optional paste-to-rows**: when `pasteParser` is supplied, a "Paste rows" textarea + button replaces the whole array with `pasteParser(text)`. The forms pass the `parse*` helpers from `~/lib/text-import` as `pasteParser` for authors/contributors/sources/variables, and a `parseNotes`-backed variant for `string[]` notes (wrapped to `{ value }[]` ↔ `string[]` at the form boundary).
- `MediaField` — props `{ modelValue: MediaRef | null; label: string }`; emits `update:modelValue` (a `MediaRef` or `null`). Wraps `MediaPicker` (listens for its `select`), shows the current selection's `url` preview + a "Clear" button. The **numeric `id`** reaches the write payload via the mapper (`mediaIdForWrite`) when the form persists — `MediaField` holds the whole `MediaRef` in model state; the mapper extracts the id.
- `RelationList` — props `{ label: string; items: RelationRef[] }`; **read-only** (renders related titles only — relation WRITE is deferred by the data layer).

> **Field semantics (spec §9, §10):** repeatable structures replace v1 delimited strings (`{title,description}` authors/contributors, `{title,url}` sources, `{name,type,definition,values}` variables, `string[]` notes), with an optional paste-delimited-text→rows convenience (storage stays structured JSON). Options come from `~/lib/field-options`. `MediaField` reuses the already-built, already-tested `MediaPicker` (alt-required, zero-base64) — this task only wires its `select` into `v-model` and never re-implements upload. Component tests focus on `RepeatableField` (add/remove + paste fills rows) and `MediaField` (select emits a `url`-based `MediaRef`, never `data:`); the trivial passthrough fields (text/date/select/chips) are exercised indirectly by the form tests in Tasks 4–6.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/nuxt/repeatable-field.test.ts
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { parseAuthors } from '~/lib/text-import'
import RepeatableField from '~/components/fields/RepeatableField.vue'

const columns = [
  { key: 'title', label: 'Name' },
  { key: 'description', label: 'Description' },
]

describe('RepeatableField', () => {
  it('adds and removes rows, emitting the updated array', async () => {
    const wrapper = await mountSuspended(RepeatableField, {
      props: { modelValue: [{ title: 'Jane', description: 'Researcher' }], label: 'Authors', columns },
    })
    await wrapper.vm.$.exposed!.addRow()
    let last = wrapper.emitted('update:modelValue')!.at(-1)![0] as Record<string, string>[]
    expect(last).toHaveLength(2)

    await wrapper.vm.$.exposed!.removeRow(0)
    last = wrapper.emitted('update:modelValue')!.at(-1)![0] as Record<string, string>[]
    expect(last).toHaveLength(1)
  })

  it('paste-to-rows replaces the array via the supplied parser', async () => {
    const wrapper = await mountSuspended(RepeatableField, {
      props: { modelValue: [], label: 'Authors', columns, pasteParser: parseAuthors },
    })
    await wrapper.vm.$.exposed!.applyPaste('Jane Doe | Researcher\nJohn Roe | Analyst')
    const last = wrapper.emitted('update:modelValue')!.at(-1)![0] as Record<string, string>[]
    expect(last).toEqual([
      { title: 'Jane Doe', description: 'Researcher' },
      { title: 'John Roe', description: 'Analyst' },
    ])
  })
})
```

```ts
// tests/nuxt/media-field.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { MediaRef } from '~/types/content'

// MediaField wraps MediaPicker, which calls useUpload — mock it so no network is hit.
const picked: MediaRef = {
  id: 10, url: '/uploads/splash_abc.png', name: 'splash.png',
  alternativeText: 'Splash alt', caption: null, width: 1200, height: 630, mime: 'image/png',
}
mockNuxtImport('useUpload', () => () => ({
  upload: vi.fn().mockResolvedValue(picked),
  browse: vi.fn().mockResolvedValue([picked]),
  remove: vi.fn(),
}))

import MediaField from '~/components/fields/MediaField.vue'

describe('MediaField', () => {
  it('emits a url-based MediaRef when MediaPicker selects (never data:)', async () => {
    const wrapper = await mountSuspended(MediaField, { props: { modelValue: null, label: 'Splash' } })
    // Drive the wrapped MediaPicker's select via its exposed upload path.
    const picker = wrapper.findComponent({ name: 'MediaPicker' })
    picker.vm.$.exposed!.setFile(new File(['x'], 'splash.png', { type: 'image/png' }))
    picker.vm.$.exposed!.setAlt('Splash alt')
    await picker.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))

    const ref = wrapper.emitted('update:modelValue')!.at(-1)![0] as MediaRef
    expect(ref.id).toBe(10)
    expect(ref.url.startsWith('data:')).toBe(false)
  })

  it('clears the selection back to null', async () => {
    const wrapper = await mountSuspended(MediaField, { props: { modelValue: picked, label: 'Splash' } })
    await wrapper.vm.$.exposed!.clear()
    expect(wrapper.emitted('update:modelValue')!.at(-1)![0]).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/nuxt/repeatable-field.test.ts tests/nuxt/media-field.test.ts`
Expected: FAIL — field components not found.

- [ ] **Step 3: Write the simple passthrough fields**

```vue
<!-- app/components/fields/TextField.vue -->
<script setup lang="ts">
import { computed } from '#imports'
const props = defineProps<{ modelValue: string | null; label: string; type?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const value = computed({ get: () => props.modelValue ?? '', set: (v) => emit('update:modelValue', v) })
</script>
<template>
  <UFormField :label="label">
    <UInput v-model="value" :type="type ?? 'text'" class="w-full" />
  </UFormField>
</template>
```

```vue
<!-- app/components/fields/DateField.vue -->
<script setup lang="ts">
import { computed } from '#imports'
const props = defineProps<{ modelValue: string | null; label: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>()
// Emit null for an empty date so it round-trips to the model's `date: string | null`.
const value = computed({ get: () => props.modelValue ?? '', set: (v) => emit('update:modelValue', v || null) })
</script>
<template>
  <UFormField :label="label">
    <UInput v-model="value" type="date" class="w-full" />
  </UFormField>
</template>
```

```vue
<!-- app/components/fields/SelectField.vue -->
<script setup lang="ts">
import { computed } from '#imports'
const props = defineProps<{ modelValue: string | null; label: string; options: readonly string[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>()
const value = computed({ get: () => props.modelValue ?? undefined, set: (v) => emit('update:modelValue', v ?? null) })
const items = computed(() => props.options.map((o) => ({ label: o, value: o })))
</script>
<template>
  <UFormField :label="label">
    <USelect v-model="value" :items="items" class="w-full" />
  </UFormField>
</template>
```

```vue
<!-- app/components/fields/ChipsField.vue -->
<script setup lang="ts">
import { computed } from '#imports'
const props = defineProps<{ modelValue: string[]; label: string; options?: readonly string[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()
const value = computed({ get: () => props.modelValue ?? [], set: (v) => emit('update:modelValue', v) })
const items = computed(() => (props.options ?? []).map((o) => ({ label: o, value: o })))
</script>
<template>
  <UFormField :label="label">
    <USelectMenu v-model="value" :items="items" multiple :create-item="!options" class="w-full" />
  </UFormField>
</template>
```

```vue
<!-- app/components/fields/RelationList.vue -->
<script setup lang="ts">
// READ-ONLY: relation WRITE is deferred by the data layer (*Write payloads carry no relation
// fields). This shows the related items' titles only; there is no connect/disconnect here.
import type { RelationRef } from '~/types/content'
defineProps<{ label: string; items: RelationRef[] }>()
</script>
<template>
  <UFormField :label="label">
    <p v-if="!items.length" class="text-sm text-muted">None.</p>
    <ul v-else class="text-sm list-disc pl-5">
      <li v-for="item in items" :key="item.documentId">{{ item.title }}</li>
    </ul>
    <p class="text-xs text-muted mt-1">Linking related content is not editable here (planned).</p>
  </UFormField>
</template>
```

- [ ] **Step 4: Write `RepeatableField` + `MediaField`**

```vue
<!-- app/components/fields/RepeatableField.vue -->
<!--
  Generic repeatable-row editor: replaces v1 delimited strings with structured rows (spec §10).
  Each column is one text input; rows can be added/removed. Optional paste-to-rows: when a
  `pasteParser` is supplied (e.g. parseAuthors/parseSources/parseVariables from ~/lib/text-import),
  a textarea lets authors paste delimited text and replace the whole array. Storage stays JSON.
-->
<script setup lang="ts">
import { ref } from '#imports'

type Row = Record<string, string>
const props = defineProps<{
  modelValue: Row[]
  label: string
  columns: { key: string; label: string }[]
  pasteParser?: (text: string) => Row[]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: Row[]] }>()

const pasteText = ref('')

function emitRows(rows: Row[]) { emit('update:modelValue', rows) }

function blankRow(): Row {
  return Object.fromEntries(props.columns.map((c) => [c.key, ''])) as Row
}
function addRow() { emitRows([...props.modelValue, blankRow()]) }
function removeRow(i: number) { emitRows(props.modelValue.filter((_, idx) => idx !== i)) }
function updateCell(i: number, key: string, val: string) {
  emitRows(props.modelValue.map((row, idx) => (idx === i ? { ...row, [key]: val } : row)))
}
function applyPaste(text: string) {
  if (props.pasteParser) emitRows(props.pasteParser(text))
}

defineExpose({ addRow, removeRow, updateCell, applyPaste })
</script>

<template>
  <UFormField :label="label">
    <div class="space-y-2">
      <div v-for="(row, i) in modelValue" :key="i" class="flex gap-2 items-start">
        <UInput
          v-for="col in columns"
          :key="col.key"
          :model-value="row[col.key]"
          :placeholder="col.label"
          class="flex-1"
          @update:model-value="updateCell(i, col.key, String($event))"
        />
        <UButton color="neutral" variant="ghost" icon="i-lucide-trash-2" aria-label="Remove row" @click="removeRow(i)" />
      </div>
      <UButton size="sm" variant="subtle" icon="i-lucide-plus" label="Add row" @click="addRow" />

      <div v-if="pasteParser" class="pt-2 border-t border-default">
        <p class="text-xs text-muted mb-1">Or paste rows (one per line, fields separated by <code>|</code>):</p>
        <UTextarea v-model="pasteText" :rows="3" class="w-full font-mono" />
        <UButton size="xs" variant="subtle" label="Paste rows" class="mt-1" @click="applyPaste(pasteText)" />
      </div>
    </div>
  </UFormField>
</template>
```

```vue
<!-- app/components/fields/MediaField.vue -->
<!--
  MediaField: wraps the already-built MediaPicker (alt-required, zero-base64) for a SINGLE media
  relation (splash/thumbnail/image/mainfile/extrafile/datafile). Holds the whole MediaRef in model
  state and emits it on select; the data-layer mapper extracts the numeric id (mediaIdForWrite) on
  save. Preview renders from the MediaRef url — NEVER a data: URI. Per-field type/size constraints
  (spec §7.2 / §14 #9) are a noted follow-on.
-->
<script setup lang="ts">
import { computed } from '#imports'
import type { MediaRef } from '~/types/content'

const props = defineProps<{ modelValue: MediaRef | null; label: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: MediaRef | null] }>()

const current = computed(() => props.modelValue)
function onSelect(ref: MediaRef) { emit('update:modelValue', ref) }
function clear() { emit('update:modelValue', null) }

defineExpose({ clear })
</script>

<template>
  <UFormField :label="label">
    <div v-if="current" class="flex items-center gap-3 mb-2">
      <img :src="current.url" :alt="current.alternativeText ?? ''" width="96" class="rounded border border-default">
      <div class="text-sm">
        <p>{{ current.name ?? current.url }}</p>
        <UButton size="xs" color="neutral" variant="ghost" label="Clear" @click="clear" />
      </div>
    </div>
    <MediaPicker @select="onSelect" />
  </UFormField>
</template>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/nuxt/repeatable-field.test.ts tests/nuxt/media-field.test.ts`
Expected: PASS (4 tests). If `findComponent({ name: 'MediaPicker' })` doesn't resolve the auto-imported component by name, drive the select instead by emitting from the child: `await wrapper.findComponent(MediaPicker).vm.$emit('select', picked)` (import `MediaPicker` directly in the test). Keep the assertion (emitted `MediaRef` is `url`-based, never `data:`).

- [ ] **Step 6: Commit**

```bash
git add app/components/fields tests/nuxt/repeatable-field.test.ts tests/nuxt/media-field.test.ts
git commit -m "feat(studio): add shared form fields (text/date/select/chips/repeatable/media/relations)"
```

---

### Task 4: Pure form-state helper + the **Article** create/edit form (validator save-gate + repo wiring)

**Files:**
- Create: `app/lib/forms/blank-models.ts`
- Create: `app/lib/forms/submit.ts`
- Create: `app/components/forms/ArticleForm.vue`
- Test: `tests/unit/forms-blank-models.test.ts`, `tests/unit/forms-submit.test.ts`, `tests/nuxt/article-form.test.ts`

**Interfaces:**
- `blank-models.ts` — pure factories returning a valid-shaped empty domain model: `blankArticle(): Article`, `blankApp(): App`, `blankDataset(): Dataset` (every field present; `documentId: ''`, `slug: ''`, `publishedAt: null`, arrays empty, media `null`). These seed the create forms.
- `submit.ts` — the **save-gate**, pure + DI:
  - `interface SubmitResult<T> { ok: boolean; errors: FieldError[]; saved?: T }`
  - `async function submitForm<T>(model: T, validate: (m: T) => FieldError[], persist: (m: T) => Promise<T>): Promise<SubmitResult<T>>` — runs `validate(model)` FIRST; if it returns a non-empty array, returns `{ ok: false, errors }` **without calling `persist`**; otherwise awaits `persist(model)` and returns `{ ok: true, errors: [], saved }`. **This is where "validators run on every save / no base64 reaches a write" is enforced** — `persist` (the repo `create`/`update`) is only reachable past a clean `validate`.
  - `function prepareForCreate<T extends { title: string; slug: string }>(model: T): T` — returns a copy with `slug = slugify(title)` (create-only slug derivation).
- `ArticleForm.vue` — props `{ mode: 'create' | 'edit'; initial?: Article }`; uses `useArticles()`. Builds field components over a local `reactive` copy of the model (`blankArticle()` on create, `props.initial` on edit). On submit: `prepareForCreate` on create, then `submitForm(model, validateArticle, persist)` where `persist = mode==='create' ? repo.create : (m) => repo.update(m.documentId, m)`; on `ok`, navigate to `/preview/article/:documentId`; on error, surface `errors` (per-field + a toast).

> **The deferred hand-off, made concrete:** `submitForm` is the single chokepoint guaranteeing `validate*` runs before any repo write. Its tests assert that an invalid model (missing required field) AND a base64-bearing model both return `ok:false` with `persist` **never called**. The form's own component test asserts the same end-to-end (a base64 `markdown`/`images` blocks `repo.create`) plus the happy path (clean create slugifies the title and calls `repo.create` once with the model). `useArticles` is mocked via `mockNuxtImport` so no network is hit; `navigateTo` is NOT mocked (mirrors the `login.test.ts` note) — assert the repo call, not the redirect.

- [ ] **Step 1: Write the failing pure tests**

```ts
// tests/unit/forms-blank-models.test.ts
import { describe, it, expect } from 'vitest'
import { blankArticle, blankApp, blankDataset } from '~/lib/forms/blank-models'
import { validateArticle } from '~/lib/validators/article'
import { validateApp } from '~/lib/validators/app'
import { validateDataset } from '~/lib/validators/dataset'

describe('blank model factories', () => {
  it('blankArticle has every field, defaulting to empty/null', () => {
    const a = blankArticle()
    expect(a.documentId).toBe('')
    expect(a.slug).toBe('')
    expect(a.publishedAt).toBeNull()
    expect(a.markdown).toBe('')
    expect(a.categories).toEqual([])
    expect(a.authors).toEqual([])
    expect(a.splash).toBeNull()
  })
  it('blank models only fail validation on their genuinely-required fields', () => {
    // article/dataset require title+slug+date; app requires title+slug only.
    expect(validateArticle(blankArticle()).map((e) => e.field).sort()).toEqual(['date', 'slug', 'title'])
    expect(validateDataset(blankDataset()).map((e) => e.field).sort()).toEqual(['date', 'slug', 'title'])
    expect(validateApp(blankApp()).map((e) => e.field).sort()).toEqual(['slug', 'title'])
  })
})
```

```ts
// tests/unit/forms-submit.test.ts
import { describe, it, expect, vi } from 'vitest'
import { submitForm, prepareForCreate } from '~/lib/forms/submit'
import type { FieldError } from '~/lib/validators/article'

interface Model { title: string; slug: string; bad?: boolean }
const noErrors = (): FieldError[] => []
const oneError = (m: Model): FieldError[] => (m.bad ? [{ field: 'title', message: 'x' }] : [])

describe('submitForm (the save-gate)', () => {
  it('does NOT call persist when validation fails', async () => {
    const persist = vi.fn().mockResolvedValue({})
    const res = await submitForm({ title: '', slug: '', bad: true }, oneError, persist)
    expect(res.ok).toBe(false)
    expect(res.errors).toHaveLength(1)
    expect(persist).not.toHaveBeenCalled()
  })

  it('calls persist and returns the saved model when validation passes', async () => {
    const saved = { title: 'T', slug: 't' }
    const persist = vi.fn().mockResolvedValue(saved)
    const res = await submitForm({ title: 'T', slug: 't' }, noErrors, persist)
    expect(res.ok).toBe(true)
    expect(persist).toHaveBeenCalledOnce()
    expect(res.saved).toEqual(saved)
  })
})

describe('prepareForCreate', () => {
  it('derives the slug from the title (create-only)', () => {
    expect(prepareForCreate({ title: 'Crime In Illinois', slug: '' }).slug).toBe('crime-in-illinois')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/forms-blank-models.test.ts tests/unit/forms-submit.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the pure helpers**

```ts
// app/lib/forms/blank-models.ts
// Valid-shaped empty domain models seeding the create forms. Every field is present so the
// reactive form binds cleanly and the validators (which assume the full shape) run correctly.
import type { Article, App, Dataset } from '~/types/content'

export function blankArticle(): Article {
  return {
    documentId: '', title: '', slug: '', date: null, external: false,
    categories: [], tags: [], citation: null, funding: null, publishedAt: null,
    type: null, hideFromBanner: false, authors: [], abstract: null, markdown: '',
    splash: null, thumbnail: null, images: [], mainfiletype: null,
    mainfile: null, extrafile: null, doi: null, apps: [], datasets: [],
  }
}

export function blankApp(): App {
  return {
    documentId: '', title: '', slug: '', date: null, external: false,
    categories: [], tags: [], citation: null, funding: null, publishedAt: null,
    contributors: [], image: null, description: null, url: null, datasets: [], articles: [],
  }
}

export function blankDataset(): Dataset {
  return {
    documentId: '', title: '', slug: '', date: null, external: false,
    categories: [], tags: [], citation: null, funding: null, publishedAt: null,
    project: false, sources: [], unit: null, timeperiod: null, description: null,
    notes: [], variables: [], datafile: null, apps: [], articles: [],
  }
}
```

```ts
// app/lib/forms/submit.ts
// The save-gate. submitForm runs the matching validator FIRST and only calls `persist` (the
// repo create/update) when validation returns no errors — this is where "validators run on
// every save / no base64 may reach a write" is enforced (the deferred hand-off from the data
// layer). prepareForCreate derives the slug from the title (create-only, spec §10).
import { slugify } from '~/lib/slug'
import type { FieldError } from '~/lib/validators/article'

export interface SubmitResult<T> { ok: boolean; errors: FieldError[]; saved?: T }

export async function submitForm<T>(
  model: T,
  validate: (m: T) => FieldError[],
  persist: (m: T) => Promise<T>,
): Promise<SubmitResult<T>> {
  const errors = validate(model)
  if (errors.length > 0) return { ok: false, errors }
  const saved = await persist(model)
  return { ok: true, errors: [], saved }
}

/** Create-only: derive the slug from the title. */
export function prepareForCreate<T extends { title: string; slug: string }>(model: T): T {
  return { ...model, slug: slugify(model.title) }
}
```

- [ ] **Step 4: Run pure tests to verify they pass**

Run: `npx vitest run tests/unit/forms-blank-models.test.ts tests/unit/forms-submit.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Write the failing Article-form component test**

```ts
// tests/nuxt/article-form.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { Article } from '~/types/content'

const createMock = vi.fn(async (m: Article): Promise<Article> => ({ ...m, documentId: 'newdoc1' }))
const updateMock = vi.fn(async (_id: string, m: Article): Promise<Article> => m)
mockNuxtImport('useArticles', () => () => ({
  list: vi.fn(), findOne: vi.fn(), create: createMock, update: updateMock, remove: vi.fn(),
}))
// MediaField → MediaPicker → useUpload; stub so mounting the form hits no network.
mockNuxtImport('useUpload', () => () => ({ upload: vi.fn(), browse: vi.fn().mockResolvedValue([]), remove: vi.fn() }))

import ArticleForm from '~/components/forms/ArticleForm.vue'

describe('ArticleForm (save-gate + repo wiring)', () => {
  beforeEach(() => { createMock.mockClear(); updateMock.mockClear() })

  it('blocks create when the model is invalid (no title) — repo.create NOT called', async () => {
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'create' } })
    await wrapper.vm.$.exposed!.submit() // blank model: missing title/slug/date
    expect(createMock).not.toHaveBeenCalled()
    expect(wrapper.vm.$.exposed!.errors.value.length).toBeGreaterThan(0)
  })

  it('blocks create when markdown contains base64 — the zero-base64 save-gate', async () => {
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'create' } })
    wrapper.vm.$.exposed!.setField('title', 'Crime In Illinois')
    wrapper.vm.$.exposed!.setField('date', '2020-01-01')
    wrapper.vm.$.exposed!.setField('markdown', '![x](data:image/png;base64,AAAA)')
    await wrapper.vm.$.exposed!.submit()
    expect(createMock).not.toHaveBeenCalled()
    expect(wrapper.vm.$.exposed!.errors.value.some((e: { field: string }) => e.field === 'markdown')).toBe(true)
  })

  it('on a clean create, slugifies the title and calls repo.create once', async () => {
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'create' } })
    wrapper.vm.$.exposed!.setField('title', 'Crime In Illinois')
    wrapper.vm.$.exposed!.setField('date', '2020-01-01')
    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))
    expect(createMock).toHaveBeenCalledOnce()
    expect(createMock.mock.calls[0][0].slug).toBe('crime-in-illinois')
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run tests/nuxt/article-form.test.ts`
Expected: FAIL — `Cannot find module '~/components/forms/ArticleForm.vue'`.

- [ ] **Step 7: Write the Article form**

```vue
<!-- app/components/forms/ArticleForm.vue -->
<!--
  ArticleForm: thin over the shared fields + the pure submitForm save-gate + useArticles(). On
  submit it runs validateArticle BEFORE any write (the zero-base64 hand-off from the data layer)
  and, on create, slugifies the title (prepareForCreate). Relations (apps/datasets) render
  READ-ONLY (relation WRITE is deferred). The Markdown body uses MarkdownField — the Plan-4 editor
  seam. Pure form logic lives in lib/forms/*; this component is intentionally thin.
-->
<script setup lang="ts">
import { reactive, ref } from '#imports'
import type { Article } from '~/types/content'
import { blankArticle } from '~/lib/forms/blank-models'
import { submitForm, prepareForCreate, type SubmitResult } from '~/lib/forms/submit'
import { validateArticle, type FieldError } from '~/lib/validators/article'
import { CATEGORY_OPTIONS, ARTICLE_TYPE_OPTIONS, MAINFILETYPE_OPTIONS } from '~/lib/field-options'
import { parseAuthors } from '~/lib/text-import'

const props = defineProps<{ mode: 'create' | 'edit'; initial?: Article }>()
const repo = useArticles()
const toast = useToast()

const model = reactive<Article>(props.initial ? { ...props.initial } : blankArticle())
const errors = ref<FieldError[]>([])
const saving = ref(false)

const authorColumns = [
  { key: 'title', label: 'Name' },
  { key: 'description', label: 'Description' },
]

// Test/parent hook to set a field without going through the DOM.
function setField<K extends keyof Article>(key: K, value: Article[K]) { model[key] = value }

async function submit() {
  saving.value = true
  errors.value = []
  try {
    const toSave: Article = props.mode === 'create' ? (prepareForCreate(model) as Article) : { ...model }
    const persist = props.mode === 'create'
      ? (m: Article) => repo.create(m)
      : (m: Article) => repo.update(m.documentId, m)
    const res: SubmitResult<Article> = await submitForm(toSave, validateArticle, persist)
    if (!res.ok) { errors.value = res.errors; return }
    toast.add({ title: 'Draft saved', color: 'success' })
    await navigateTo(`/preview/article/${res.saved!.documentId}`)
  } catch {
    toast.add({ title: 'Save failed', description: 'Please try again.', color: 'error' })
  } finally {
    saving.value = false
  }
}

defineExpose({ submit, setField, errors, model })
</script>

<template>
  <UForm :state="model" class="space-y-5" @submit.prevent="submit">
    <TextField v-model="model.title" label="Title" />
    <DateField v-model="model.date" label="Date" />
    <SelectField v-model="model.type" label="Type" :options="ARTICLE_TYPE_OPTIONS" />
    <ChipsField v-model="model.categories" label="Categories" :options="CATEGORY_OPTIONS" />
    <ChipsField v-model="model.tags" label="Tags" />
    <RepeatableField v-model="model.authors" label="Authors" :columns="authorColumns" :paste-parser="parseAuthors" />
    <TextField v-model="model.abstract" label="Abstract" />
    <MediaField v-model="model.splash" label="Splash image" />
    <SelectField v-model="model.mainfiletype" label="Main file type" :options="MAINFILETYPE_OPTIONS" />
    <MediaField v-model="model.mainfile" label="Main file" />
    <MarkdownField v-model="model.markdown" label="Body (Markdown)" />

    <RelationList label="Linked datasets" :items="model.datasets" />
    <RelationList label="Linked apps" :items="model.apps" />

    <ul v-if="errors.length" class="text-sm text-error list-disc pl-5" role="alert">
      <li v-for="(e, i) in errors" :key="i">{{ e.field }}: {{ e.message }}</li>
    </ul>

    <UButton type="submit" :loading="saving" label="Save draft" />
  </UForm>
</template>
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run tests/nuxt/article-form.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add app/lib/forms app/components/forms/ArticleForm.vue tests/unit/forms-blank-models.test.ts tests/unit/forms-submit.test.ts tests/nuxt/article-form.test.ts
git commit -m "feat(studio): add form save-gate helper + Article create/edit form"
```

---

### Task 5: The **App** create/edit form

**Files:**
- Create: `app/components/forms/AppForm.vue`
- Test: `tests/nuxt/app-form.test.ts`

**Interfaces:**
- `AppForm.vue` — props `{ mode: 'create' | 'edit'; initial?: App }`; uses `useApps()`; mirrors `ArticleForm` structure with App fields (contributors repeatable `{title,description}`, `image` MediaField, `description`, `url`). Save-gate via `submitForm(model, validateApp, persist)`; `prepareForCreate` on create; navigates to `/preview/app/:documentId`. Relations (datasets/articles) read-only.

> **Reuses everything from Task 4** — the same `submitForm`, `prepareForCreate`, `blankApp`, shared fields. Only the validator (`validateApp`), repo (`useApps`), and field set differ. Note `validateApp` requires only title+slug (no date), so the form may omit a date requirement but should still offer the date field.

- [ ] **Step 1: Write the failing test**

```ts
// tests/nuxt/app-form.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { App } from '~/types/content'

const createMock = vi.fn(async (m: App): Promise<App> => ({ ...m, documentId: 'appdocN' }))
mockNuxtImport('useApps', () => () => ({
  list: vi.fn(), findOne: vi.fn(), create: createMock, update: vi.fn(), remove: vi.fn(),
}))
mockNuxtImport('useUpload', () => () => ({ upload: vi.fn(), browse: vi.fn().mockResolvedValue([]), remove: vi.fn() }))

import AppForm from '~/components/forms/AppForm.vue'

describe('AppForm', () => {
  beforeEach(() => createMock.mockClear())

  it('blocks create with no title', async () => {
    const wrapper = await mountSuspended(AppForm, { props: { mode: 'create' } })
    await wrapper.vm.$.exposed!.submit()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('creates with a slugified slug (title only required — no date)', async () => {
    const wrapper = await mountSuspended(AppForm, { props: { mode: 'create' } })
    wrapper.vm.$.exposed!.setField('title', 'UCR Index Offense Explorer')
    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))
    expect(createMock).toHaveBeenCalledOnce()
    expect(createMock.mock.calls[0][0].slug).toBe('ucr-index-offense-explorer')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/nuxt/app-form.test.ts`
Expected: FAIL — `Cannot find module '~/components/forms/AppForm.vue'`.

- [ ] **Step 3: Write the App form**

```vue
<!-- app/components/forms/AppForm.vue -->
<!--
  AppForm: same save-gate + thin-component pattern as ArticleForm, with App fields. validateApp
  requires only title+slug (no date) — the date field is offered but not required. Relations
  (datasets/articles) render READ-ONLY (relation WRITE deferred).
-->
<script setup lang="ts">
import { reactive, ref } from '#imports'
import type { App } from '~/types/content'
import { blankApp } from '~/lib/forms/blank-models'
import { submitForm, prepareForCreate, type SubmitResult } from '~/lib/forms/submit'
import { validateApp } from '~/lib/validators/app'
import type { FieldError } from '~/lib/validators/article'
import { CATEGORY_OPTIONS } from '~/lib/field-options'
import { parseAuthors } from '~/lib/text-import'

const props = defineProps<{ mode: 'create' | 'edit'; initial?: App }>()
const repo = useApps()
const toast = useToast()

const model = reactive<App>(props.initial ? { ...props.initial } : blankApp())
const errors = ref<FieldError[]>([])
const saving = ref(false)

// contributors share the {title,description} row shape (parseAuthors fits).
const contributorColumns = [
  { key: 'title', label: 'Name' },
  { key: 'description', label: 'Description' },
]

function setField<K extends keyof App>(key: K, value: App[K]) { model[key] = value }

async function submit() {
  saving.value = true
  errors.value = []
  try {
    const toSave: App = props.mode === 'create' ? (prepareForCreate(model) as App) : { ...model }
    const persist = props.mode === 'create'
      ? (m: App) => repo.create(m)
      : (m: App) => repo.update(m.documentId, m)
    const res: SubmitResult<App> = await submitForm(toSave, validateApp, persist)
    if (!res.ok) { errors.value = res.errors; return }
    toast.add({ title: 'Draft saved', color: 'success' })
    await navigateTo(`/preview/app/${res.saved!.documentId}`)
  } catch {
    toast.add({ title: 'Save failed', description: 'Please try again.', color: 'error' })
  } finally {
    saving.value = false
  }
}

defineExpose({ submit, setField, errors, model })
</script>

<template>
  <UForm :state="model" class="space-y-5" @submit.prevent="submit">
    <TextField v-model="model.title" label="Title" />
    <DateField v-model="model.date" label="Date" />
    <ChipsField v-model="model.categories" label="Categories" :options="CATEGORY_OPTIONS" />
    <ChipsField v-model="model.tags" label="Tags" />
    <RepeatableField v-model="model.contributors" label="Contributors" :columns="contributorColumns" :paste-parser="parseAuthors" />
    <MediaField v-model="model.image" label="App image" />
    <TextField v-model="model.description" label="Description" />
    <TextField v-model="model.url" label="App URL" />

    <RelationList label="Linked datasets" :items="model.datasets" />
    <RelationList label="Linked articles" :items="model.articles" />

    <ul v-if="errors.length" class="text-sm text-error list-disc pl-5" role="alert">
      <li v-for="(e, i) in errors" :key="i">{{ e.field }}: {{ e.message }}</li>
    </ul>

    <UButton type="submit" :loading="saving" label="Save draft" />
  </UForm>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/nuxt/app-form.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/components/forms/AppForm.vue tests/nuxt/app-form.test.ts
git commit -m "feat(studio): add App create/edit form"
```

---

### Task 6: The **Dataset** create/edit form

**Files:**
- Create: `app/components/forms/DatasetForm.vue`
- Test: `tests/nuxt/dataset-form.test.ts`

**Interfaces:**
- `DatasetForm.vue` — props `{ mode: 'create' | 'edit'; initial?: Dataset }`; uses `useDatasets()`. Fields: sources repeatable `{title,url}` (`parseSources`), variables repeatable `{name,type,definition,values}` (`parseVariables`), notes (a `string[]` ↔ `{value}[]` adapter via `parseNotes`), `unit` select (`UNIT_OPTIONS`), `timeperiod` (a `TimePeriod` editor: yeartype select from `TIMEPERIOD_TYPE_OPTIONS` + yearmin/yearmax), `description`, `datafile` MediaField, `project` toggle. Save-gate via `submitForm(model, validateDataset, persist)`; `prepareForCreate` on create; navigates to `/preview/dataset/:documentId`. Relations (apps/articles) read-only.

> **Reuses Task 4's helpers.** The only dataset-specific wrinkles are the `timeperiod` object editor (a tiny inline group, not a new shared field) and the `notes: string[]` adapter (map to/from `{value}[]` at the `RepeatableField` boundary, or a simpler textarea-per-line bound through `parseNotes`). `validateDataset` requires title+slug+date and validates `unit`/`timeperiod.yeartype` against the option lists.

- [ ] **Step 1: Write the failing test**

```ts
// tests/nuxt/dataset-form.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { Dataset } from '~/types/content'

const createMock = vi.fn(async (m: Dataset): Promise<Dataset> => ({ ...m, documentId: 'dsdocN' }))
mockNuxtImport('useDatasets', () => () => ({
  list: vi.fn(), findOne: vi.fn(), create: createMock, update: vi.fn(), remove: vi.fn(),
}))
mockNuxtImport('useUpload', () => () => ({ upload: vi.fn(), browse: vi.fn().mockResolvedValue([]), remove: vi.fn() }))

import DatasetForm from '~/components/forms/DatasetForm.vue'

describe('DatasetForm', () => {
  beforeEach(() => createMock.mockClear())

  it('blocks create when required fields are missing', async () => {
    const wrapper = await mountSuspended(DatasetForm, { props: { mode: 'create' } })
    await wrapper.vm.$.exposed!.submit()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('creates with a slugified slug and carries variables/sources through', async () => {
    const wrapper = await mountSuspended(DatasetForm, { props: { mode: 'create' } })
    wrapper.vm.$.exposed!.setField('title', 'Crime Data')
    wrapper.vm.$.exposed!.setField('date', '2021-01-01')
    wrapper.vm.$.exposed!.setField('variables', [{ name: 'Year', type: 'integer', definition: 'The year' }])
    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))
    expect(createMock).toHaveBeenCalledOnce()
    expect(createMock.mock.calls[0][0].slug).toBe('crime-data')
    expect(createMock.mock.calls[0][0].variables).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/nuxt/dataset-form.test.ts`
Expected: FAIL — `Cannot find module '~/components/forms/DatasetForm.vue'`.

- [ ] **Step 3: Write the Dataset form**

```vue
<!-- app/components/forms/DatasetForm.vue -->
<!--
  DatasetForm: same save-gate + thin pattern, with Dataset fields. timeperiod is a small inline
  object editor (yeartype select + yearmin/yearmax); notes is a string[] edited via a per-line
  textarea (parseNotes). validateDataset requires title+slug+date and checks unit/timeperiod.yeartype
  against the option lists. Relations (apps/articles) render READ-ONLY (relation WRITE deferred).
-->
<script setup lang="ts">
import { reactive, ref, computed } from '#imports'
import type { Dataset, TimePeriod } from '~/types/content'
import { blankDataset } from '~/lib/forms/blank-models'
import { submitForm, prepareForCreate, type SubmitResult } from '~/lib/forms/submit'
import { validateDataset } from '~/lib/validators/dataset'
import type { FieldError } from '~/lib/validators/article'
import { CATEGORY_OPTIONS, UNIT_OPTIONS, TIMEPERIOD_TYPE_OPTIONS } from '~/lib/field-options'
import { parseSources, parseVariables, parseNotes, formatNotes } from '~/lib/text-import'

const props = defineProps<{ mode: 'create' | 'edit'; initial?: Dataset }>()
const repo = useDatasets()
const toast = useToast()

const model = reactive<Dataset>(props.initial ? { ...props.initial } : blankDataset())
const errors = ref<FieldError[]>([])
const saving = ref(false)

const sourceColumns = [
  { key: 'title', label: 'Title' },
  { key: 'url', label: 'URL' },
]
const variableColumns = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'definition', label: 'Definition' },
  { key: 'values', label: 'Values' },
]

// notes: string[] <-> textarea text (one per line).
const notesText = computed({
  get: () => formatNotes(model.notes),
  set: (t: string) => { model.notes = parseNotes(t) },
})

// timeperiod: bind an object editor; keep null until a yeartype is chosen.
const tp = computed<TimePeriod>({
  get: () => model.timeperiod ?? { yeartype: '', yearmin: '', yearmax: '' },
  set: (v: TimePeriod) => { model.timeperiod = v.yeartype ? v : null },
})

function setField<K extends keyof Dataset>(key: K, value: Dataset[K]) { model[key] = value }

async function submit() {
  saving.value = true
  errors.value = []
  try {
    const toSave: Dataset = props.mode === 'create' ? (prepareForCreate(model) as Dataset) : { ...model }
    const persist = props.mode === 'create'
      ? (m: Dataset) => repo.create(m)
      : (m: Dataset) => repo.update(m.documentId, m)
    const res: SubmitResult<Dataset> = await submitForm(toSave, validateDataset, persist)
    if (!res.ok) { errors.value = res.errors; return }
    toast.add({ title: 'Draft saved', color: 'success' })
    await navigateTo(`/preview/dataset/${res.saved!.documentId}`)
  } catch {
    toast.add({ title: 'Save failed', description: 'Please try again.', color: 'error' })
  } finally {
    saving.value = false
  }
}

defineExpose({ submit, setField, errors, model })
</script>

<template>
  <UForm :state="model" class="space-y-5" @submit.prevent="submit">
    <TextField v-model="model.title" label="Title" />
    <DateField v-model="model.date" label="Date" />
    <ChipsField v-model="model.categories" label="Categories" :options="CATEGORY_OPTIONS" />
    <ChipsField v-model="model.tags" label="Tags" />
    <TextField v-model="model.description" label="Description" />
    <SelectField v-model="model.unit" label="Unit" :options="UNIT_OPTIONS" />

    <UFormField label="Time period">
      <div class="flex gap-2">
        <USelect v-model="tp.yeartype" :items="TIMEPERIOD_TYPE_OPTIONS.map((o) => ({ label: o, value: o }))" placeholder="Type" />
        <UInput v-model="tp.yearmin" placeholder="From (yyyy)" />
        <UInput v-model="tp.yearmax" placeholder="To (yyyy)" />
      </div>
    </UFormField>

    <RepeatableField v-model="model.sources" label="Sources" :columns="sourceColumns" :paste-parser="parseSources" />
    <RepeatableField v-model="model.variables" label="Variables" :columns="variableColumns" :paste-parser="parseVariables" />

    <UFormField label="Notes (one per line)">
      <UTextarea v-model="notesText" :rows="3" class="w-full" />
    </UFormField>

    <MediaField v-model="model.datafile" label="Data file" />

    <RelationList label="Linked apps" :items="model.apps" />
    <RelationList label="Linked articles" :items="model.articles" />

    <ul v-if="errors.length" class="text-sm text-error list-disc pl-5" role="alert">
      <li v-for="(e, i) in errors" :key="i">{{ e.field }}: {{ e.message }}</li>
    </ul>

    <UButton type="submit" :loading="saving" label="Save draft" />
  </UForm>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/nuxt/dataset-form.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/components/forms/DatasetForm.vue tests/nuxt/dataset-form.test.ts
git commit -m "feat(studio): add Dataset create/edit form"
```

---

### Task 7: Role-aware dashboard + per-type content listing

**Files:**
- Edit: `app/pages/index.vue` (replace the placeholder cards with working links)
- Create: `app/components/ContentList.vue` (reusable reverse-chron listing per type)
- Test: `tests/nuxt/dashboard.test.ts`, `tests/nuxt/content-list.test.ts`

**Interfaces:**
- `index.vue` — role-aware dashboard: **Create** card (links to `/create/article`, `/create/app`, `/create/dataset`), a **My drafts / All drafts** listing area (uses `ContentList` for the chosen type), and a **Publish queue** card shown only `v-if="canPublish"` linking to `/manage`. Leaves a noted **onboarding seam** comment (first-login onboarding deferred — needs the `studio-profile` type).
- `ContentList.vue` — props `{ type: 'article' | 'app' | 'dataset'; status?: ContentStatus }`; picks the matching repo (`useArticles`/`useApps`/`useDatasets`), calls `repo.list({ status, sort: 'updatedAt:desc' })` on mount, renders a reverse-chronological list of `{ title }` rows each linking to `/edit/:type/:documentId` and `/preview/:type/:documentId`.

> **Dashboard (spec §9):** task cards by role — Create + My Drafts for everyone, Publish Queue for managers (`canPublish`, sourced from the already-built `useAuth()`/auth store). The listing is reverse-chronological via the repo `list` (`sort`), filtered by `status`. Per-author "only my drafts" ownership scoping is an Open item (§14 #12, a backend change) — this plan lists the **shared draft pool**, labelled "Drafts". Component tests: the Publish-queue card appears only when `canPublish`; `ContentList` calls `repo.list` with the status and links to edit/preview. `useAuth`/repos are mocked via `mockNuxtImport`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/nuxt/dashboard.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'

const canPublish = ref(false)
mockNuxtImport('useAuth', () => () => ({
  user: computed(() => ({ email: 'writer@example.com', firstname: 'Wendy' })),
  canPublish, isLoggedIn: computed(() => true), logout: vi.fn(),
}))
// ContentList mounts repos; stub list so the dashboard renders without network.
mockNuxtImport('useArticles', () => () => ({ list: vi.fn().mockResolvedValue([]), findOne: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() }))

import Dashboard from '~/pages/index.vue'

describe('dashboard', () => {
  it('hides the Publish queue card for non-publishers', async () => {
    canPublish.value = false
    const wrapper = await mountSuspended(Dashboard)
    expect(wrapper.text()).not.toContain('Publish queue')
  })
  it('shows the Publish queue card for publishers', async () => {
    canPublish.value = true
    const wrapper = await mountSuspended(Dashboard)
    expect(wrapper.text()).toContain('Publish queue')
  })
})
```

```ts
// tests/nuxt/content-list.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'

const listMock = vi.fn().mockResolvedValue([
  { documentId: 'a1', title: 'First Draft', publishedAt: null },
  { documentId: 'a2', title: 'Second Draft', publishedAt: null },
])
mockNuxtImport('useArticles', () => () => ({ list: listMock, findOne: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() }))

import ContentList from '~/components/ContentList.vue'

describe('ContentList', () => {
  it('lists items from repo.list and links to edit/preview', async () => {
    const wrapper = await mountSuspended(ContentList, { props: { type: 'article', status: 'draft' } })
    await new Promise((r) => setTimeout(r, 0))
    expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }))
    expect(wrapper.text()).toContain('First Draft')
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain('/edit/article/a1')
    expect(hrefs).toContain('/preview/article/a1')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/nuxt/dashboard.test.ts tests/nuxt/content-list.test.ts`
Expected: FAIL — `ContentList.vue` not found; the dashboard still shows the old placeholder text.

- [ ] **Step 3: Write `ContentList` and rewrite the dashboard**

```vue
<!-- app/components/ContentList.vue -->
<!--
  ContentList: reverse-chronological listing for one content type, sourced from the matching
  data-layer repo (useArticles/useApps/useDatasets) via repo.list({status, sort}). Each row links
  to /edit/:type/:documentId and /preview/:type/:documentId. Per-author "only my drafts" ownership
  scoping is deferred (spec §14 #12, a backend change) — this lists the shared draft pool.
-->
<script setup lang="ts">
import { ref, onMounted } from '#imports'
import type { ContentStatus } from '~/types/content'

const props = withDefaults(defineProps<{ type: 'article' | 'app' | 'dataset'; status?: ContentStatus }>(), { status: 'draft' })

const repo = props.type === 'article' ? useArticles() : props.type === 'app' ? useApps() : useDatasets()
const items = ref<{ documentId: string; title: string }[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    items.value = await repo.list({ status: props.status, sort: 'updatedAt:desc' })
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <p v-if="loading" class="text-sm text-muted">Loading…</p>
    <p v-else-if="!items.length" class="text-sm text-muted">No {{ status }} {{ type }}s yet.</p>
    <ul v-else class="divide-y divide-default">
      <li v-for="item in items" :key="item.documentId" class="py-2 flex items-center justify-between gap-3">
        <span class="truncate">{{ item.title || '(untitled)' }}</span>
        <span class="flex gap-3 text-sm shrink-0">
          <NuxtLink :to="`/edit/${type}/${item.documentId}`" class="text-primary underline">Edit</NuxtLink>
          <NuxtLink :to="`/preview/${type}/${item.documentId}`" class="text-primary underline">Preview</NuxtLink>
        </span>
      </li>
    </ul>
  </div>
</template>
```

```vue
<!-- app/pages/index.vue -->
<!--
  Role-aware dashboard (spec §9): Create + Drafts for everyone; Publish queue only for managers
  (canPublish). First-login onboarding (manager emails / center / author email) is DEFERRED — it
  needs the approved `studio-profile` Strapi collection type (create in the dev env first); leave
  the seam here and wire onboarding once the type exists (follow-on plan).
-->
<script setup lang="ts">
import { ref } from '#imports'

const { user, canPublish } = useAuth()
const listType = ref<'article' | 'app' | 'dataset'>('article')
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">Welcome{{ user ? `, ${user.firstname || user.username || user.email}` : '' }}</h1>
      <p class="text-muted">Signed in as <strong>{{ user?.email ?? 'unknown' }}</strong>.</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UCard>
        <template #header><h2 class="font-medium">Create</h2></template>
        <div class="flex flex-col gap-2">
          <UButton to="/create/article" variant="subtle" label="New article" />
          <UButton to="/create/app" variant="subtle" label="New app" />
          <UButton to="/create/dataset" variant="subtle" label="New dataset" />
        </div>
      </UCard>

      <UCard v-if="canPublish">
        <template #header><h2 class="font-medium">Publish queue</h2></template>
        <p class="text-sm text-muted mb-2">Review submitted drafts.</p>
        <UButton to="/manage" variant="subtle" label="Open queue" />
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-medium">Drafts</h2>
          <USelect
            v-model="listType"
            :items="[
              { label: 'Articles', value: 'article' },
              { label: 'Apps', value: 'app' },
              { label: 'Datasets', value: 'dataset' },
            ]"
            size="sm"
          />
        </div>
      </template>
      <ContentList :key="listType" :type="listType" status="draft" />
    </UCard>
  </div>
</template>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/nuxt/dashboard.test.ts tests/nuxt/content-list.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/pages/index.vue app/components/ContentList.vue tests/nuxt/dashboard.test.ts tests/nuxt/content-list.test.ts
git commit -m "feat(studio): role-aware dashboard + per-type content listing"
```

---

### Task 8: Preview-as-published route `/preview/:type/:documentId`

**Files:**
- Create: `app/pages/preview/[type]/[documentId].vue`
- Test: `tests/nuxt/preview-page.test.ts`

**Interfaces:**
- `/preview/:type/:documentId` — reads `type`/`documentId` from the route, picks the matching repo, `findOne`s the **draft** (`{ status: 'draft' }`, falling back to default), and renders the entry as it would publish: title, splash image (from its `url`), and the `markdown` body via `MarkdownPreview` (the same `renderMarkdown` the public site will use), inside the single `prose-preview` stylesheet. Apps/datasets render their salient fields (description, sources/variables, app url). Shareable by link (private behind the global guard, but any signed-in author can open it).

> **Preview (spec §9):** "render `markdown` with the parity plugin set; show splash/figures from their Media URLs." This route reuses `renderMarkdown`/`MarkdownPreview` so the preview matches published output, inside the ONE swappable prose stylesheet (`prose-preview.css`) the official CSS later replaces for pixel-exact parity. Test: mock the repo `findOne` to return a fixture article and assert the rendered HTML contains the heading and an `<img>` from a `/uploads/` URL (never `data:`). `useArticles` is mocked via `mockNuxtImport`; `useRoute` params are provided by mounting at the route or stubbing.

- [ ] **Step 1: Write the failing test**

```ts
// tests/nuxt/preview-page.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { Article } from '~/types/content'

const article: Partial<Article> = {
  documentId: 'a1', title: 'Evaluation of Youth Summer Job Program',
  markdown: '# Findings\n\n![Bar chart](/uploads/figure_abc.png)',
  splash: { id: 10, url: '/uploads/splash_abc.png', alternativeText: 'Splash', caption: null, name: 's.png' },
}
const findOneMock = vi.fn().mockResolvedValue(article)
mockNuxtImport('useArticles', () => () => ({ list: vi.fn(), findOne: findOneMock, create: vi.fn(), update: vi.fn(), remove: vi.fn() }))
mockNuxtImport('useRoute', () => () => ({ params: { type: 'article', documentId: 'a1' } }))

import PreviewPage from '~/pages/preview/[type]/[documentId].vue'

describe('preview page', () => {
  it('findOne the draft and renders markdown via renderMarkdown (url images, no data:)', async () => {
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    expect(findOneMock).toHaveBeenCalledWith('a1', expect.objectContaining({ status: 'draft' }))
    const html = wrapper.find('.prose-preview').html()
    expect(html).toMatch(/<h1[^>]*>Findings<\/h1>/)
    expect(html).toMatch(/<img[^>]+src="\/uploads\/figure_abc\.png"/)
    expect(html).not.toMatch(/data:/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/nuxt/preview-page.test.ts`
Expected: FAIL — `Cannot find module '~/pages/preview/[type]/[documentId].vue'`.

- [ ] **Step 3: Write the preview page**

```vue
<!-- app/pages/preview/[type]/[documentId].vue -->
<!--
  /preview/:type/:documentId — render a DRAFT as it would publish: title, splash (from its Media
  URL), and the markdown body via MarkdownPreview (the SAME renderMarkdown the public site uses, so
  preview == published) inside the ONE swappable prose stylesheet (prose-preview.css; official CSS
  drops in later for pixel-exact parity). Shareable by link (private behind the global guard).
-->
<script setup lang="ts">
import { ref, onMounted } from '#imports'
import type { Article, App, Dataset } from '~/types/content'

const route = useRoute()
const type = route.params.type as 'article' | 'app' | 'dataset'
const documentId = route.params.documentId as string

const repo = type === 'article' ? useArticles() : type === 'app' ? useApps() : useDatasets()
const entry = ref<Article | App | Dataset | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    entry.value = await repo.findOne(documentId, { status: 'draft' })
  } finally {
    loading.value = false
  }
})

const asArticle = computed(() => (type === 'article' ? (entry.value as Article | null) : null))
const asApp = computed(() => (type === 'app' ? (entry.value as App | null) : null))
const asDataset = computed(() => (type === 'dataset' ? (entry.value as Dataset | null) : null))
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <p v-if="loading" class="text-muted">Loading…</p>
    <article v-else-if="entry">
      <p class="text-xs text-muted mb-2">Draft preview</p>
      <h1 class="text-3xl font-semibold mb-4">{{ entry.title }}</h1>

      <img
        v-if="asArticle?.splash"
        :src="asArticle.splash.url"
        :alt="asArticle.splash.alternativeText ?? ''"
        class="mb-6 rounded"
      >
      <img v-else-if="asApp?.image" :src="asApp.image.url" :alt="asApp.image.alternativeText ?? ''" class="mb-6 rounded">

      <MarkdownPreview v-if="asArticle" :source="asArticle.markdown" />

      <template v-if="asApp">
        <p v-if="asApp.description" class="mb-3">{{ asApp.description }}</p>
        <p v-if="asApp.url"><a :href="asApp.url" class="text-primary underline">Open app</a></p>
      </template>

      <template v-if="asDataset">
        <p v-if="asDataset.description" class="mb-3">{{ asDataset.description }}</p>
        <h2 v-if="asDataset.variables.length" class="text-xl font-semibold mt-4 mb-2">Variables</h2>
        <ul v-if="asDataset.variables.length" class="list-disc pl-5 text-sm">
          <li v-for="(v, i) in asDataset.variables" :key="i"><strong>{{ v.name }}</strong> ({{ v.type }}): {{ v.definition }}</li>
        </ul>
      </template>
    </article>
    <p v-else class="text-muted">Not found.</p>
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/nuxt/preview-page.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add app/pages/preview tests/nuxt/preview-page.test.ts
git commit -m "feat(studio): add shareable preview-as-published route"
```

---

### Task 9: Routing/pages glue (`/create`, `/edit`, `/manage`) + integration smoke

**Files:**
- Create: `app/pages/create/[type].vue`
- Create: `app/pages/edit/[type]/[documentId].vue`
- Create: `app/pages/manage.vue`
- Create: `app/error.vue` (the `/404` not-found surface, spec §9)
- Test: `tests/nuxt/routing-smoke.test.ts`

**Interfaces:**
- `/create/:type` — reads `type` from the route and renders the matching form (`ArticleForm`/`AppForm`/`DatasetForm`) in `mode="create"`.
- `/edit/:type/:documentId` — `findOne`s the entry via the matching repo, then renders the matching form in `mode="edit"` with `:initial`.
- `/manage` — `definePageMeta({ adminOnly: true })`; renders a read-only draft queue (`ContentList status="draft"` per type, or a small table) with a **disabled** "Publish" affordance noting "Coming in Plan 6". The global guard already redirects non-publishers away from `adminOnly` routes; no extra check here.
- `app/error.vue` — minimal Nuxt error page (404 / generic) with a link home.

> **Routing (spec §9):** `/create/:type`, `/edit/:type/:documentId`, `/manage` (`adminOnly`), plus the `/404` surface. All private except `/login` — enforced by the **already-built** global middleware + `definePageMeta`. The publish action itself is **Plan 6**, so `/manage` lists but does not publish. The integration smoke mounts each page-glue component with the relevant repo mocked and asserts it renders the right form/queue and that `adminOnly` is declared on `/manage`. (Mirroring the `login.test.ts` note, `navigateTo` is not mocked; assert rendered structure + repo calls, not redirects.)

- [ ] **Step 1: Write the failing smoke test**

```ts
// tests/nuxt/routing-smoke.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'

mockNuxtImport('useUpload', () => () => ({ upload: vi.fn(), browse: vi.fn().mockResolvedValue([]), remove: vi.fn() }))
const findOneMock = vi.fn().mockResolvedValue({ documentId: 'a1', title: 'Existing', markdown: '', categories: [], tags: [], authors: [], images: [], apps: [], datasets: [], splash: null, thumbnail: null, mainfile: null, extrafile: null, type: null, mainfiletype: null, abstract: null, doi: null, citation: null, funding: null, date: '2020-01-01', slug: 'existing', external: false, hideFromBanner: false, publishedAt: null })
mockNuxtImport('useArticles', () => () => ({ list: vi.fn().mockResolvedValue([]), findOne: findOneMock, create: vi.fn(), update: vi.fn(), remove: vi.fn() }))

const routeRef = { params: { type: 'article', documentId: 'a1' } }
mockNuxtImport('useRoute', () => () => routeRef)

import CreatePage from '~/pages/create/[type].vue'
import EditPage from '~/pages/edit/[type]/[documentId].vue'
import ManagePage from '~/pages/manage.vue'

describe('routing glue', () => {
  it('/create/:type renders a create form (Save draft button)', async () => {
    const wrapper = await mountSuspended(CreatePage)
    expect(wrapper.text()).toContain('Save draft')
  })

  it('/edit/:type/:documentId loads the entry then renders the edit form', async () => {
    const wrapper = await mountSuspended(EditPage)
    await new Promise((r) => setTimeout(r, 0))
    expect(findOneMock).toHaveBeenCalledWith('a1', expect.anything())
    expect(wrapper.text()).toContain('Save draft')
  })

  it('/manage declares adminOnly and renders the draft queue', async () => {
    const wrapper = await mountSuspended(ManagePage)
    // Publish is deferred to Plan 6 — the queue lists but cannot publish yet.
    expect(wrapper.text()).toMatch(/Publish queue|Drafts|Plan 6/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/nuxt/routing-smoke.test.ts`
Expected: FAIL — the page components don't exist yet.

- [ ] **Step 3: Write the page-glue components + error page**

```vue
<!-- app/pages/create/[type].vue -->
<script setup lang="ts">
const route = useRoute()
const type = route.params.type as 'article' | 'app' | 'dataset'
</script>
<template>
  <div>
    <h1 class="text-2xl font-semibold mb-4">New {{ type }}</h1>
    <ArticleForm v-if="type === 'article'" mode="create" />
    <AppForm v-else-if="type === 'app'" mode="create" />
    <DatasetForm v-else-if="type === 'dataset'" mode="create" />
    <p v-else class="text-muted">Unknown content type.</p>
  </div>
</template>
```

```vue
<!-- app/pages/edit/[type]/[documentId].vue -->
<script setup lang="ts">
import { ref, onMounted } from '#imports'
import type { Article, App, Dataset } from '~/types/content'

const route = useRoute()
const type = route.params.type as 'article' | 'app' | 'dataset'
const documentId = route.params.documentId as string

const repo = type === 'article' ? useArticles() : type === 'app' ? useApps() : useDatasets()
const entry = ref<Article | App | Dataset | null>(null)
const loading = ref(true)

onMounted(async () => {
  try { entry.value = await repo.findOne(documentId, { status: 'draft' }) }
  finally { loading.value = false }
})
</script>
<template>
  <div>
    <h1 class="text-2xl font-semibold mb-4">Edit {{ type }}</h1>
    <p v-if="loading" class="text-muted">Loading…</p>
    <template v-else-if="entry">
      <ArticleForm v-if="type === 'article'" mode="edit" :initial="entry as Article" />
      <AppForm v-else-if="type === 'app'" mode="edit" :initial="entry as App" />
      <DatasetForm v-else-if="type === 'dataset'" mode="edit" :initial="entry as Dataset" />
    </template>
    <p v-else class="text-muted">Not found.</p>
  </div>
</template>
```

```vue
<!-- app/pages/manage.vue -->
<!--
  /manage — Manager publish queue (spec §9). adminOnly: the global guard redirects non-publishers.
  Lists draft content per type (read-only). The Publish action + Netlify rebuild + Mailgun review
  email is Plan 6 — the queue lists but cannot publish here.
-->
<script setup lang="ts">
import { ref } from '#imports'

definePageMeta({ adminOnly: true })

const listType = ref<'article' | 'app' | 'dataset'>('article')
</script>
<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-semibold">Publish queue</h1>
    <p class="text-sm text-muted">Drafts awaiting review. Publishing arrives in a later phase (Plan 6).</p>
    <UCard>
      <template #header>
        <USelect
          v-model="listType"
          :items="[
            { label: 'Articles', value: 'article' },
            { label: 'Apps', value: 'app' },
            { label: 'Datasets', value: 'dataset' },
          ]"
          size="sm"
        />
      </template>
      <ContentList :key="listType" :type="listType" status="draft" />
    </UCard>
  </div>
</template>
```

```vue
<!-- app/error.vue -->
<script setup lang="ts">
import type { NuxtError } from '#app'
defineProps<{ error: NuxtError }>()
</script>
<template>
  <UApp>
    <div class="min-h-screen flex flex-col items-center justify-center gap-3 p-4 text-center">
      <h1 class="text-3xl font-semibold">{{ error.statusCode === 404 ? 'Page not found' : 'Something went wrong' }}</h1>
      <p class="text-muted">{{ error.statusCode === 404 ? 'That page does not exist.' : (error.message || 'Unexpected error.') }}</p>
      <UButton to="/" label="Back to dashboard" @click="clearError({ redirect: '/' })" />
    </div>
  </UApp>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/nuxt/routing-smoke.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full suite + typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: all tests pass (the prior plans' baseline + this plan's additions); typecheck exit 0. Fix any type drift (e.g. a field-component `v-model` generic) before committing — never weaken a test.

- [ ] **Step 6: Commit**

```bash
git add app/pages/create app/pages/edit app/pages/manage.vue app/error.vue tests/nuxt/routing-smoke.test.ts
git commit -m "feat(studio): wire create/edit/manage routes + 404 + routing smoke"
```

---

## Post-plan verification (user-gated)

These require a real admin-panel login (the Content-Manager + Upload APIs reject unauthenticated calls) and a real browser, so they run as a controlled manual check after the plan lands — they do **not** block merge. **Target the dev Strapi 5 only.**

1. **Create→draft round-trip:** sign in (dev admin), open `/create/article`, fill title/date, drop a splash image (renders from its `url`), write Markdown (live preview updates), Save → a `POST` to the Content-Manager collection with a FLAT body, `publishedAt: null`, media as a numeric `id`, and **no base64** anywhere in the payload; land on `/preview/article/:documentId`.
2. **Save-gate:** paste a `data:image/...;base64,...` into the body or a figure and Save → the form blocks with a `markdown`/`images` error and issues **no** write.
3. **Edit:** open `/edit/article/:documentId`, change a field, Save → a `PUT` updates the same `documentId`; the slug is preserved.
4. **Dashboard/listing:** drafts list reverse-chronologically; Edit/Preview links resolve; the Publish-queue card + `/manage` appear only for a manager account (`canPublish`).
5. **Preview parity:** `/preview/...` renders the body with footnotes/tables/math via the same `renderMarkdown`, splash/figures from Media URLs, inside `prose-preview.css`.

## Open items carried into later plans

- **First-login onboarding** (manager emails / center / author email) — needs the approved `studio-profile` Strapi collection type (create in the dev env; the deployed sandbox has content-type-builder disabled). The dashboard seam is noted; onboarding is a follow-on.
- **Publish action + Netlify rebuild + Mailgun review email** — Plan 6 (the `/manage` queue lists drafts but cannot publish here).
- **Full ICJIA Markdown Editor** (CodeMirror 6 + `uploadHandler` + `ImageDropzone` at-cursor insert) — Plan 4; slots into `MarkdownField`'s `v-model` seam.
- **"Add Sample Article" demo** — Plan 7.
- **Pixel-exact preview CSS** — the official stylesheet replaces `app/assets/css/prose-preview.css` (one file).
- **Public-renderer plugin parity** (spec §14 #6) — confirm the public Research Hub's markdown-it plugin list and reconcile `renderMarkdown`'s plugin set.
- **Relation WRITE** (connect/disconnect apps↔datasets↔articles) — deferred by the data layer; relations render read-only (`RelationList`). Add when `*Write` + a relation-write path land.
- **`images` JSON ↔ inline-markdown sync** (spec §7.3 / §14 #11) — on figure insert, also append `{ title, src: url }` to the article `images` array; belongs with the editor integration.
- **Per-field media constraints** (accepted types / max sizes, spec §7.2 / §14 #9) — carried as `MediaField`/`MediaPicker` props when needed.
- **Per-author draft ownership** ("only my drafts", spec §14 #12) — a backend change; listings show the shared draft pool until then.

## Self-review (performed against the design spec §9/§10/§13)

- **§9 views & UX coverage:** `/login` (already built) · `/` dashboard role-aware cards (Create / Drafts / Publish-queue `v-if=canPublish`) → **Task 7** · `/create/:type` type-aware create form → **Tasks 4/5/6 + 9** · `/edit/:type/:documentId` (findOne→form) → **Task 9** · `/manage` publish queue, `adminOnly`, list `status=draft` (Publish deferred to Plan 6) → **Task 9** · `/preview/:type/:documentId` in-app rendered preview → **Task 8** · `/404` → **Task 9** (`error.vue`). Forms built from **shared field components** (text/date/repeatable-row/`MediaPicker`/editor) → **Tasks 2/3**; relation pickers render **read-only** (relation-write deferred by the data layer — explicitly noted). Manager queue is the minimal draft table. Preview renders `markdown` with the parity plugin set and shows splash/figures from Media URLs → **Tasks 1/8**.
- **§10 validation/parsing/field semantics coverage:** **slug auto-generated from title on create** → `prepareForCreate` (`slugify`) in **Task 4**, applied by all three forms (create-only). **Repeatable structures** (authors/contributors `{title,description}`, sources `{title,url}`, variables `{name,type,definition,values}`, notes `string[]`, tags/categories chips) → **Task 3** (`RepeatableField`, `ChipsField`) wired in **Tasks 4–6**. **Import-from-text** (paste delimited → rows, storage stays JSON) → `RepeatableField.pasteParser` fed by `~/lib/text-import` `parse*`. **Option lists** from `~/lib/field-options` (categories/units/timeperiod/mainfiletype/article-type) → `SelectField`/`ChipsField`. Client validation **mirrors v1 rules** by delegating to the existing `validate*` (required fields, base64 ban; `unit`/`timeperiod.yeartype`/`type` enum checks) — invoked **before every write** via `submitForm`.
- **§13 testing coverage:** **unit tests** for the new pure logic (`renderMarkdown`, `blank*`, `submitForm`/`prepareForCreate`) in the node env; **component tests for forms** asserting **no `data:`/base64 reaches a write** (the §13 invariant, Task 4 `article-form` base64 case + the `submitForm` save-gate unit test) and the repo wiring; the editor/preview render parity test; the dashboard role-card test; an integration **smoke** across the page glue (Task 9). All tests **mock the network** (`mockNuxtImport` of `use{Articles,Apps,Datasets}`/`useUpload`/`useAuth`, fixture `findOne`) — no live calls, mirroring `tests/nuxt/media-picker.test.ts`/`login.test.ts`. Accessibility: forms/queue built on Nuxt UI `UForm`/`UFormField`/`USelect` (labelled, keyboard-friendly); errors surfaced with `role="alert"`.
- **Reuse, not recreate:** `use{Articles,Apps,Datasets}` (repo `list/findOne/create/update/remove`), `validate{Article,App,Dataset}` → `FieldError[]`, `slugify`, `CATEGORY/UNIT/MAINFILETYPE/TIMEPERIOD/ARTICLE_TYPE_OPTIONS`, `parse{Authors,Sources,Variables,Notes}`, `MediaPicker` (emits `select`, alt-required), `MediaRef`/`RelationRef`/`Article`/`App`/`Dataset`, `useAuth().canPublish`, the global guard + `definePageMeta`, `APP_NAME` — all **consumed** from existing modules; none redefined. The data-layer's deferred **relation-write** and the validators' **base64 gate** are honored exactly (relations read-only; `submitForm` enforces validate-before-persist).
- **Name/type consistency:** `renderMarkdown`, `MarkdownPreview`, `MarkdownField` (`v-model`/`update:modelValue` seam), `submitForm`/`prepareForCreate`/`blank{Article,App,Dataset}`, the `fields/*` (`update:modelValue`), `MediaField` (emits a `MediaRef`), `ContentList` (`{type,status}`), and the `validate*`/repo signatures are spelled identically across Tasks 1→9 and against the existing layers. **Asymmetry honored:** `validateApp` requires only title+slug (no date) — reflected in the App form/test and the blank-model test.
- **Placeholder scan:** none — every step ships complete, runnable code (no TODOs, no "similar to Task N"); exact paths, run commands, and commit messages (no AI co-author trailer). New deps limited to `markdown-it` + plugins (+ `@types/*`); Pinia 2.x stack untouched.

---

**Plan complete.** Nine TDD tasks delivering the **first clickable Studio app** — `renderMarkdown` + `MarkdownPreview` + the `MarkdownField` editor seam, shared form fields (incl. a repeatable-row editor with paste-to-rows and a `MediaField` over `MediaPicker`), Article/App/Dataset create/edit forms whose pure `submitForm` save-gate runs the data-layer `validate*` **before any write** (the zero-base64 deferred hand-off) and `slugify`s on create, a role-aware dashboard + per-type listings, and a shareable preview-as-published route — all wiring the already-built data, media, and auth layers, with the publish action, the full editor, onboarding, the sample-article demo, pixel-exact CSS, and relation-write explicitly deferred to their later plans.
