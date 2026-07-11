# Body markdown linter + empty body-images on new articles — design

**Date:** 2026-07-08 · **Status:** Approved (design reviewed in-session) · **Owner:** cschweda

Two small, independent authoring improvements to the article editor:

1. **Body linter** — an on-demand "Check" button in the body editor that lists heading/image/link
   issues in plain language; clicking an issue jumps to that line.
2. **Empty body-images on new articles** — the sidebar "Body images" tray no longer pre-loads
   sample figures on every article. A blank new article starts empty; authors add their own.

Both are additive and touch only the Studio editor. Neither changes the publish pipeline, the
markdown renderer, or published output.

## 1. Scope

**In scope**

- A pure `lintMarkdown(source)` module + a "Check" button and results panel in `MarkdownEditor.vue`,
  shown for the **full** editor only (the article body), not the compact Abstract editor.
- Gating the `BodyImagesField` sample-figure seed on an explicit prop instead of `isDemoMode()`, so
  new articles start with an empty tray; plus a demo-build-only "Load sample figures" button so
  presenters can still demonstrate figure insertion on demand.

**Out of scope (v1)**

- No lint on the Abstract/summary fields, apps, or datasets.
- No blocking Publish on lint issues (advisory only — a possible later reuse of `lintMarkdown`).
- No live inline squiggles / CodeMirror lint gutter, no `@codemirror/lint` dependency.
- No `table-columns` rule yet — the renderer uses `markdown-it-multimd-table` (rowspan/colspan/
  headerless), so a naive column-count check would false-positive on valid tables. Deferred.
- No change to how figures are inserted or to the zero-base64 upload path.

## 2. Decisions and rationale

| Decision | Choice | Why |
|---|---|---|
| Lint trigger | On-demand "Check" button + a live, debounced count badge | Audience is non-technical R&A authors; always-on errors read as "you're doing it wrong." A button is an intentional "review my work" moment (like spell-check) and mirrors the existing Preview toggle. The badge keeps passive awareness. |
| Lint results UI | A results panel below the editor; each row click jumps to + selects the line | Gives the "go to where it occurs" navigation the sidebar option promised, without always-on clutter. |
| Lint engine | Small hand-written pure function, curated rules, friendly messages | A generic markdownlint dump (50+ rules, `MD001`-style names) is wrong for this audience. Pure + line-based → trivially unit-testable (repo has 647 tests) and dependency-free (pinned-deps posture). |
| Code fences | Lint skips fenced (```` ``` ````/`~~~`) blocks | So code examples never false-flag as headings/images. |
| Body-images seed | Gate on a `seedSamples` prop set by the `?sample=1` create path, default off | The old `isDemoMode()` seed put the same 8 figures on **every** article, which reads as leftover "old images" on a new one. A blank article should be blank. |
| Demo showcase | Demo-build-only "Load sample figures" button (opt-in, nothing pre-loaded) | The deployed demo blocks uploads, so without a seed the tray can never show insertion. Opt-in keeps the demo capable while honoring "defaults to no images." |

## 3. Feature 1 — Body markdown linter

### 3.1 Pure module — `app/lib/editor/markdown-lint.ts`

```ts
export type LintRuleId =
  | 'body-heading-level'   // '#' H1 used in the body (reserved for the page title)
  | 'heading-increment'    // heading level jumps more than one deeper (## -> ####)
  | 'empty-heading'        // a heading line with no text
  | 'image-alt-missing'    // ![](url) with empty alt text
  | 'empty-link-text'      // [](url) with no visible text

export interface LintIssue {
  line: number             // 1-based line number in the source
  column?: number          // 1-based column (for image/link matches)
  severity: 'warn' | 'info'
  rule: LintRuleId
  message: string          // plain-language, author-facing
}

export function lintMarkdown(source: string): LintIssue[]
```

**Algorithm** (single line-based pass; no external AST):

1. Split into lines. Track a fenced-code toggle (open on a line matching `^\s*(```|~~~)`, close on
   the matching fence). Lines inside a fence are skipped entirely.
2. For each non-fenced line:
   - **Headings** — match `^(#{1,6})(\s+.*)?$`.
     - Text empty (nothing after the hashes, ignoring a trailing closing `#`s) → `empty-heading` (info).
     - `level === 1` → `body-heading-level` (warn): *"`#` is the article title — start your sections at `##`."*
     - Track the previous heading level (baseline **1**, the implicit page title). If
       `level > prevLevel + 1` → `heading-increment` (warn): *"Heading jumps from `H{prev}` to
       `H{level}` — add the missing `{'#'.repeat(prev+1)}` level."* Then `prevLevel = level`.
   - **Images** — scan `!\[([^\]]*)\]\([^)]*\)`; if the alt is blank/whitespace →
     `image-alt-missing` (warn) at the match column: *"Image is missing alt text (needed for screen readers)."*
   - **Links** — scan inline `[text](url)` not preceded by `!`; if text is blank →
     `empty-link-text` (info): *"This link has no visible text."* (Footnote refs `[^1]` have text, so
     they never match.)
3. Return issues sorted by `(line, column ?? 0)`.

Clean document → `[]`. **Known limitation:** the image/link scans do not special-case *inline*
code spans (`` `![x](y)` ``); markdown image/link syntax inside backticks on a non-fenced line
could still match. Rare in prose; accepted for v1 (fenced code blocks — the common case — are
skipped).

### 3.2 UI — `app/components/MarkdownEditor.vue` (full mode only)

- New reactive state: `issues: LintIssue[]`, `showIssues: boolean`, recomputed from `modelValue`
  on mount and on change (debounced ~250 ms) so the badge stays current.
- **"Check" button** in the toolbar's right cluster, beside Preview, rendered only when `!compact`.
  Shows the count when `issues.length > 0` (e.g. `Check · 3`); `aria-pressed` reflects `showIssues`.
  Click toggles the panel and forces an immediate recompute.
- **Results panel** below the editor grid, `v-if="showIssues && !compact"`, `role="region"` labelled
  "Markdown issues". Empty → *"No issues found."* Otherwise a list; each row is a `<button>`:
  severity icon + `Line N` + message. Click → `goToLine(issue.line)`:
  `view.dispatch({ selection: EditorSelection.range(line.from, line.to), scrollIntoView: true })`
  then `view.focus()`.
- Test seams via `defineExpose`: `__issues`, `__recomputeIssues`, `__goToLine`.

## 4. Feature 2 — Empty body-images on new articles

### 4.1 `app/components/forms/BodyImagesField.vue`

- New prop: `seedSamples?: boolean` (default `false`).
- Extract the existing seed loop into `loadSampleFigures()` (adds the 8 `sampleFigureRef` entries
  only when the tray is empty).
- `onMounted`: call `loadSampleFigures()` only when `props.seedSamples` is true (replaces the old
  `isDemoMode()` condition).
- **Demo button:** when `isDemoMode()` and the tray is empty, render a small
  `"Load sample figures"` button (beside Upload) that calls `loadSampleFigures()`. It disappears
  once the tray is populated.
- Expose `__loadSampleFigures` for tests.

### 4.2 `app/components/forms/ArticleForm.vue`

- New prop `seedSampleImages?: boolean` (default `false`); pass through:
  `<BodyImagesField :seed-samples="seedSampleImages" @insert="…" />`.

### 4.3 `app/pages/create/[type].vue`

- Pass `:seed-sample-images="isSample"` to `ArticleForm` (`isSample` already = the dev-only
  `?sample=1` path).

### 4.4 Resulting behavior

| Context | Body-images tray |
|---|---|
| Dev — New article (blank) | empty |
| Dev — Add sample article (`?sample=1`) | seeded 8 figures (**new** — the sample path now populates the tray too) |
| Deployed demo build — any new article | empty, with an opt-in **"Load sample figures"** button |
| Edit (any article) | empty |
| Production — New article | empty |

## 5. Testing

- **`tests/unit/markdown-lint.test.ts`** (new): each rule fires on a minimal case; a clean document
  → `[]`; headings/images inside a code fence are ignored; issues are line-sorted; a real sample
  body (`renderAllSampleBodies()` source) produces a sane, non-throwing result.
- **`tests/nuxt/markdown-editor.test.ts`** (extend): Check button shows the count badge; opening the
  panel lists issues; clicking a row moves the CodeMirror selection to that line; compact mode shows
  no Check button/panel.
- **`tests/nuxt/body-images-field.test.ts`** (extend): default (no prop) → empty tray (existing test
  stays green); `seedSamples` → 8 tray entries; `__loadSampleFigures()` seeds; the existing
  upload/insert/no-base64 tests are unaffected.

## 6. Rollout

- No migration, no config, no dependency changes; SPA-only (`ssr: false`), so no SSR concerns.
- `CHANGELOG.md` gets a dated entry at push time (per project convention): the body linter and the
  empty-tray-on-new-articles change.
- README "Content authoring & the editor" section gets a short note on the Check button and the
  new empty-tray default during the next currency pass.
