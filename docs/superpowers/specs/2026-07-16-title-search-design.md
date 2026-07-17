# Title search on content lists — design

**Date:** 2026-07-16 · **Status:** Approved (design reviewed in-session) · **Owner:** cschweda

Launch day imports 236 real articles; finding one by scrolling a paginated list is the first
thing an author will complain about (analysis-roadmap §5.3-6). This adds a search box to the
content lists that filters by title across the WHOLE library, server-side, in live and demo
modes identically.

## 1. Scope

**In scope**

- **`ListOptions.search?: string`** (first-class, both repos): the live repository maps it
  to Strapi `filters[title][$containsi]`, merged with the existing type/status/filters
  composition in `buildFilters`; the demo repository adds a case-insensitive title-contains
  branch in `applyFilter`, before paging — whole-set semantics in both modes.
- **Search box in `ContentList.vue`** beside the Type filter, for ALL THREE content types
  (the type dropdown stays articles-only): labeled input, debounced 300 ms
  (`MediaLibraryGrid` precedent), resets to page 1 on change (the type-filter re-page
  pattern), "No matches" empty state distinct from the no-content empty state.

**Out of scope (v1)**

- Author/body/full-text/fuzzy search; search-term highlighting; URL-persisted search state;
  virtualization (ROADMAP-listed for >250 items).

## 2. Decisions and rationale

| Decision | Choice | Why |
|---|---|---|
| Field searched | Title only | The roadmap's stated scope; titles are how staff reference articles. Author search is a cheap later add via the same seam. |
| Option shape | First-class `search` on `ListOptions` | Keeps callers simple and demo/live symmetric — mirrors how `type` is modeled (not caller-built `filters`). |
| Match semantics | `$containsi` (case-insensitive contains) | Matches the media-library search precedent; no fuzzy dependency. |
| Debounce | 300 ms | House precedent (`MediaLibraryGrid`). |
| Paging | Reset to page 1 on search change; filter applied before paging | Same behavior the type filter already has; whole-library sweep, never page-local. |

## 3. Testing

- Unit (repository): `search` maps to `filters[title][$containsi]`; composes with `type`
  (+ caller `filters`) without clobbering; absent search sends no title filter.
- Unit (demo-repository): case-insensitive contains; composes with type/status; applied
  before paging (whole-set); empty term = no filter.
- Component (ContentList): debounced repo call carries `search`; page resets to 1;
  "No matches" empty state; present for all three types; existing tests unchanged.

## 4. Documentation

CHANGELOG entry; ROADMAP move to Done at release; spec status-table row + digest bullet;
README clause. Release as v0.7.0.
