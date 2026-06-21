# Demo Mode + Paginated List — Implementation Report

## Changes

### 1. `app/lib/repository.ts` — PagedResult + listPage

Added `PagedResult<T>` interface (items, total, page, pageSize, pageCount) and `listPage(opts?: ListOptions): Promise<PagedResult<TDomain>>` to the `Repository<TDomain>` interface. Implemented `listPage` in `createRepository` reading `res.results` (mapped via `cfg.fromStrapi`) and `res.pagination` fields from the Strapi list response.

### 2. `app/lib/demo.ts` — isDemoSession

New file: `isDemoSession(): boolean` — returns `false` immediately when `import.meta.dev` is falsy (tree-shaken in production). In dev, delegates to `isDevAdminToken(useAuthStore().jwt)`.

### 3. `app/lib/demo-content.ts` — 210 articles, 40 apps, 40 datasets

New file: deterministic content generators using modular index arithmetic (no `Math.random`). Articles use `TOPIC_STEMS × YEARS × AUTHORS_POOL` pools; ~60% published (every 5th is draft); `updatedAt` spread across Jan–Feb 2026 with varied hours to produce meaningful sort ordering across pages. Images use `picsum.photos/seed/demoNNN` URLs with `id: 0` so `mediaIdForWrite` maps them to `null` and they never reach Strapi. `withUpdatedAt` helper attaches the sort key without modifying the Article domain type.

### 4. `app/lib/demo-repository.ts` — in-memory Repository<T>

New file: `makeDemoRepository<T>(seed: T[]): Repository<T>`. Clones its seed on creation; all mutations (create/update/publish/remove) affect only the in-memory store. `listPage` filters by `status` (published ↔ `publishedAt != null`; draft ↔ null; undefined → all), sorts by `updatedAt:desc` by default, paginates by `page`/`pageSize`. Never calls `$api`.

### 5. Composable wiring — useArticles / useApps / useDatasets

Updated all three composables to check `import.meta.dev && isDemoSession()` before constructing a real Strapi repository. When the demo session is active, they return `makeDemoRepository(DEMO_ARTICLES /* etc */)`.

### 6. `app/components/ContentList.vue` — table + pager

Rebuilt from a `<ul>` list to a proper `<table>` with `<th scope="col">` headers: Date · Title · Author(s) · Status · Actions. Fetches via `repo.listPage()` on mount and on page change. Status badge: `UBadge` color="success" for Published, color="neutral" for Draft. Author column: articles → `authors[].title`; apps → `contributors[].title`; datasets → `—`; truncated to first 2 names + "+N more" for 3+. Pager: Prev/Next buttons + "Page N of M · K total". Empty state when total = 0. `#row-actions` slot with `:document-id` and `:published` preserved for manage.vue.

### 7. `app/pages/index.vue` — relabeled, status omitted

Changed `<h2>Drafts</h2>` → `<h2>Articles</h2>`. Removed `status="draft"` from `<ContentList>` so all content (both published and draft) appears with status chips.

### 8. `app/layouts/default.vue` — amber demo banner

Added `isDemoSession()` import and a `v-if="demo"` amber banner (`bg-amber-50 / border-amber-200 / text-amber-800`) above the `<header>` with `role="status"` and the copy: "Demo mode — sample content. Changes are kept only for this session and are never saved to the server."

## Tests

### New test files
- `tests/unit/demo-repository.test.ts` — 12 tests covering listPage (pagination, total, pageCount, slicing), status filter (published/draft/all), list(), findOne, findOne throws, create (in-memory, no network), update (in-memory), publish (sets publishedAt), remove, and sort-by-updatedAt-desc correctness.
- `tests/unit/demo-session.test.ts` — 7 tests covering isDevAdminToken at the store integration level (token recognition, real jwt rejection, null/clearSession, boolean return type of isDemoSession).

### Updated test files
- `tests/nuxt/content-list.test.ts` — replaced with 9 tests for the new table contract: listPage mock, column rendering (Date, Author(s), Status badges), pager, empty state, "+N more" truncation.
- `tests/nuxt/dashboard.test.ts` — added `listPage` to the useArticles mock (was missing, caused crashes).
- `tests/nuxt/routing-smoke.test.ts` — added `listPage` to all three composable mocks (useArticles, useApps, useDatasets).

### Results

274/274 passing — zero failures

## Typecheck

Exit code: 0 — zero `error TS` lines (pre-existing vue-router/volar plugin warning is a non-error in this repo).

## Visual Review Checklist

- [ ] Sign in with admin/admin → amber banner appears at top of page
- [ ] Dashboard "Articles" card shows paginated table (not the old list)
- [ ] Table has Date / Title / Author(s) / Status / Actions column headers
- [ ] Date column shows YYYY-MM-DD values spread across 2019–2025
- [ ] Title column shows varied titles, truncated with link to /edit/article/...
- [ ] Author(s) column shows 1–2 names + "+N more" for 3+ authors
- [ ] Status column shows "Published" (green badge) or "Draft" (neutral badge)
- [ ] Both Published and Draft items appear on page 1 (mixed distribution: every 5th is draft)
- [ ] Pager shows "Page 1 of 9 · 210 total" with working Prev/Next buttons
- [ ] Prev button disabled on page 1; Next button disabled on last page
- [ ] Type switcher (Articles / Apps / Datasets) switches the list
- [ ] /manage still shows draft-only list (status="draft" still on that page) with Publish + Request Review buttons
- [ ] Sign in with real credentials → no banner, real Strapi data
- [ ] Creating/editing in demo mode does not send any network requests (check DevTools Network tab)
