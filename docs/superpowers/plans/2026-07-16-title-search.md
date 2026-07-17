# Title Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A debounced title-search box on the content lists filtering the whole library server-side, identical in live and demo modes.

**Architecture:** One first-class `search?: string` on `ListOptions`, honored by both repositories (live → `filters[title][$containsi]`; demo → case-insensitive contains before paging), surfaced by a labeled, debounced input in `ContentList.vue` that re-pages from 1.

**Tech Stack:** Nuxt 4 / Vue 3, Vitest 4 (`tests/unit` node; `tests/nuxt` mountSuspended/mockNuxtImport).

**Spec:** `docs/superpowers/specs/2026-07-16-title-search-design.md` (approved 2026-07-16).

## Global Constraints

- Whole-library semantics in BOTH modes: the live query param and the demo filter both apply before paging; search change resets to page 1.
- Case-insensitive contains; empty/whitespace term ⇒ NO title filter sent (live) / no filter applied (demo).
- Existing behavior and tests unchanged (the `type`/`filters` composition in `buildFilters` must not regress).
- Accessible input: a real `<label for>` or `aria-label`, matching house convention.
- TDD; no new deps; targeted `npx vitest run <file>`; full suite (baseline 800/107) + `npx nuxt typecheck` before each commit. **No AI trailers on commits.**

---

### Task 1: `search` in both repositories

**Files:**
- Modify: `app/lib/repository.ts` (ListOptions + buildFilters)
- Modify: `app/lib/demo-repository.ts` (applyFilter)
- Test: `tests/unit/repository.test.ts`, `tests/unit/demo-repository.test.ts` (existing files — READ them first; add new describes following their real fixture/mock patterns)

**Interfaces (produced):** `ListOptions.search?: string` — consumed by Task 2's component and available to every repo caller.

- [ ] **Step 1: Write the failing tests.** In the existing repository unit test file, add a describe "title search" following the file's established `$api`-mock pattern:

```ts
describe('title search (ListOptions.search)', () => {
  it('maps search to filters[title][$containsi]', async () => {
    // Use this file's existing repo/mock scaffolding: call list({ search: 'police' })
    // and assert the API call's query carries filters with title.$containsi = 'police'
    // (match the exact query-encoding style buildFilters/list already use — read the
    // existing type-filter test in this file and mirror its assertion mechanics).
  })
  it('composes with the type filter without clobbering either', async () => {
    // list({ search: 'police', type: 'update' }) → BOTH filters present.
  })
  it('sends no title filter for absent/empty/whitespace search', async () => {
    // list({}), list({ search: '' }), list({ search: '   ' }) → no title key in filters.
  })
})
```

In the demo-repository unit test file, add a describe "title search" using its established seed/factory pattern:

```ts
describe('title search', () => {
  it('filters case-insensitively by title contains, across the whole set before paging', async () => {
    // Seed >1 page of items with distinct titles; list({ search: 'POLICE', pageSize: 5 })
    // returns matches from beyond page 1's unfiltered window.
  })
  it('composes with type and status filters', async () => { /* seed accordingly */ })
  it('empty/whitespace search applies no filter', async () => { /* full set returned */ })
})
```

The test INTENT above is binding; the scaffolding must follow each file's real patterns (fixtures, mock shapes, seed factories). Show the failing runs.

- [ ] **Step 2: Implement.** `ListOptions` gains:

```ts
  /** Case-insensitive title search. Maps to Strapi `filters[title][$containsi]` on the real
   *  repo and an in-memory title-contains on the demo repo. Empty/whitespace ⇒ no filter. */
  search?: string
```

`buildFilters` (repository.ts) merges it exactly as `type` is merged (trimmed, only when non-empty):

```ts
  const term = opts.search?.trim()
  // ...existing type merge...
  if (term) merged = { ...merged, title: { $containsi: term } }
```

(Adapt to the function's actual local structure — read it first; `type` and caller `filters` must keep exact current behavior.)

`demo-repository.ts` `applyFilter`, after the type filter and before paging:

```ts
    // Title search (case-insensitive contains). Applied across ALL items before paging,
    // mirroring the live repo's filters[title][$containsi]. Empty/whitespace → no filter.
    const term = opts.search?.trim().toLowerCase()
    if (term) {
      items = items.filter((item) =>
        String((item as Record<string, unknown>).title ?? '').toLowerCase().includes(term),
      )
    }
```

- [ ] **Step 3: Green (both unit files), full suite + typecheck, commit:**
`feat(search): ListOptions.search — title contains-filter in both repositories (whole-set, pre-paging)`

---

### Task 2: Search box in ContentList

**Files:**
- Modify: `app/components/ContentList.vue`
- Test: `tests/nuxt/content-list.test.ts` (locate the exact existing file via `ls tests/nuxt/*content-list*`; READ it first)

**Interfaces:** consumes Task 1's `search` option. No public-contract change to ContentList's props/emits.

- [ ] **Step 1: Failing tests** (follow the existing file's mount/mocks — it already mocks the repos; drive the debounce like `media-library-grid.test.ts` does, via the exposed seam or fake timers):
  1. Typing a term issues a repo call carrying `search: <trimmed term>` and `page: 1` (whole-set semantics), after the debounce.
  2. Changing the search resets an advanced pager back to page 1.
  3. A term with zero matches renders a "No matches" state distinct from the no-content empty state (`data-test="content-list-no-matches"`).
  4. The input is present for all three content types (articles/apps/datasets) and carries an accessible name.

- [ ] **Step 2: Implement.** Beside the Type filter in the header row: a labeled `UInput` (`id="content-list-search"`, `<label for>` "Search", `placeholder="Search by title"`, `icon="i-lucide-search"`, `data-test="content-list-search"`), debounced 300 ms (mirror MediaLibraryGrid's `watch + setTimeout + onBeforeUnmount` cleanup), setting page to 1 then refetching exactly as the type-filter watcher does (reuse its explicit-refetch pattern). Pass `search: term || undefined` into every list call alongside the existing options. Add the no-matches state: shown when a non-empty search yields zero items.

- [ ] **Step 3: Green (component file), full suite + typecheck, single commit:**
`feat(search): title search box on content lists — debounced, whole-library, re-pages from 1`

---

### Task 3: Docs + verification

- [ ] `npm test` + `npx nuxt typecheck` first (record exact counts; expect ~815/107).
- [ ] CHANGELOG under `## [Unreleased]`, heading `### 2026-07-16 — title search`: the search box, whole-library semantics, both modes, debounce; real counts + arithmetic.
- [ ] ROADMAP: In-progress entry (pending-merge voice) replacing the "nothing in flight" note; remove title search from Next and renumber.
- [ ] Spec status row + What's-changed digest bullet (pending-merge voice); README clause (pending-merge qualified).
- [ ] `npx vitest run tests/unit/docs-nav.test.ts` → 6/6. Single commit:
`docs: title search — changelog, roadmap, spec row + digest, README (pending-merge qualified)`

---

## Plan self-review (done at authoring time)

- Spec coverage: §1 both bullets → Tasks 1–2; §2 decisions (field/shape/semantics/debounce/paging) encoded as constraints; §3 tests enumerated per task; §4 docs → Task 3.
- Type consistency: the single new symbol is `ListOptions.search?: string`; both repos and the component reference exactly that.
- This plan deliberately specifies test INTENT + component behavior rather than verbatim code for the existing-file integrations (repository/demo-repository/content-list tests all have established scaffolding the implementer must read first — the Task-4/5 pattern from the guard plan, which worked well).
