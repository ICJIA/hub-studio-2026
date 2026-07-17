# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.8.2] - 2026-07-17

_Added / decided (docs-only — no code, dependency, or CSP change)_

- **Uptime monitoring runbook'd** (the operations half of analysis-roadmap §5.4-7): runbook
  §4a instructs the UptimeRobot free-tier setup — an HTTPS monitor on the production Studio
  URL and one on Strapi's `/_health` endpoint (returns **204 No Content** unauthenticated;
  verified against the production host 2026-07-17), alert contacts on a shared R&A/dev
  inbox, an optional staging monitor during the rehearsal window — and the §4 cutover
  checklist gains "turn on the uptime monitors and confirm the test alert."
- **Client error reporter (Sentry) formally deferred** by the 2026-07-17 decision — to be
  built in at a later date. The design notes for the future build-in (DSN-gated fail-open
  client plugin, demo fully excluded, single CSP ingest-host addition, token-gated source
  maps) are recorded in `ROADMAP.md` under Deferred, and analysis-roadmap §5.4-7 is
  annotated half-done/half-deferred accordingly.

## [0.8.1] - 2026-07-17

_Fixed / verified_

- **Staging Strapi-host override — verified working and CI-guarded** (analysis-roadmap
  §5.4-8, the launch plan's sharpest edge). Empirical finding: `NUXT_PUBLIC_STRAPI_BASE_URL`
  ALREADY overrides the hardcoded backend host — the value flows through
  `runtimeConfig.public.strapiBaseUrl`, which Nuxt's env mechanism substitutes. WHERE the
  override applies depends on the build preset (both verified): static/demo output
  (`npm run generate`) bakes it in at generate time; the production build (`npm run build`,
  node-server preset) resolves it at **server runtime**, so the variable must be present
  where the server RUNS — on Netlify that means a UI/CLI-set variable (Functions scope by
  default); `netlify.toml` `[build.environment]` never reaches Functions. No code change
  was needed; what shipped is the proof and the guardrails: CI's
  production-build job now boots the built server with a sentinel override and fails
  unless the served page carries the sentinel (and doesn't carry the hardcoded host); the
  runbook's staging section (§2) replaces its "staging writes to the PRODUCTION Strapi
  unless you edit code" warning with the verified env-override instructions, the paired
  CSP `connect-src` step, and an env-scope troubleshooting note; `studio.config.ts` and
  `.env.example` document the per-preset mechanism.

## [0.8.0] - 2026-07-17

_Added_

- **Edit-conflict detection (save-time check, warn and choose).** Two authors can no
  longer silently overwrite each other's work. Every content type (Article, App, Dataset)
  now carries its Strapi `updatedAt` stamp read-only through the mappers; before every
  edit-mode save (create has nothing to conflict with), a fields-limited read
  (`getUpdatedAt`, scoped to the same DRAFT version the edit page loaded) compares that
  stamp against the one the form loaded when it opened — a check failure (network blip,
  404) **fails open**, so a transient problem never blocks a save. On a genuine conflict, a
  `role="alert"` banner interrupts the save — "This draft was changed by someone else
  while you were editing (their save: ⟨time⟩)." — with two choices: **Save anyway** (a
  one-shot bypass that overwrites the other edit) or **Load their version**, which first
  snapshots the author's own in-progress edits to the local draft backup, then loads the
  colleague's version — so the existing restore banner (the v0.6.0 unsaved-work guard) can
  offer the author's own edits back afterward, a direct synergy between the two features.
  Both flows are race-guarded — a `saving`-gate on every entry point plus busy-disabled
  banner buttons — closing a reviewer-found Critical where an impatient Save-anyway click
  mid-Load-theirs could silently persist stale content while destroying the just-taken
  snapshot in the same stroke (the whole-branch final review found the mirror-image gap on
  the OTHER banner — Restore/Discard racing Load-theirs — closed the same way). The
  unsaved-work guard's own Restore now reseeds the form's remembered `updatedAt` to the
  restored snapshot's own stamp, so a same-session restore-then-save is checked against the
  content actually being saved, not the page's load-time stamp — the fix that makes the
  ROADMAP's cross-machine stale-restore mitigation claim true rather than aspirational.
  Publish/unpublish also refreshes the remembered stamp from its response, closing a false-
  conflict a publish/unpublish would otherwise leave behind on the very next save. Works
  identically in the public demo: its in-memory store stamps `updatedAt` on every write too,
  so the check runs the same logic against the in-memory store's stamps. (The demo store is
  per-tab — a module-level map with no cross-tab sync — so reproducing a genuine two-editor
  collision is a live two-browser staging-rehearsal exercise, not a two-demo-tab one.)
  **Honest caveat:** a small check-then-write window remains between the pre-save read and
  the save itself — Strapi has no native compare-and-set to close it completely; the
  design deliberately accepts warn-and-choose over a hard lock. Spec:
  `docs/superpowers/specs/2026-07-16-edit-conflict-design.md`.

Built test-first over five reviewed tasks (per-task adversarial review, incl. one
reviewer-found Critical race closed with layered tests), plus a whole-branch final review
(a second reviewer-found Critical — the mirror-image Restore/Discard race — closed the same
way, plus the stamp-reseed, publish-refresh, and doc-truthfulness fixes above). Suite:
**868 tests / 109 files** (822 + 46 new across the feature and its fix rounds, +2 new test
files), typecheck clean. Verified live in the running app before merge: clean saves, no
false conflict after unpublish, and restore-then-save with the reseeded stamp — all
observed; a genuine two-actor collision is the staging rehearsal's named two-browser step.

## [0.7.0] - 2026-07-16

_Added_

- **Title search on content lists (debounced, whole-library).** A labeled search box now
  sits beside the Type filter on every content list — Articles, Apps, and Datasets alike
  (the Type dropdown itself stays Articles-only) — filtering by **title**, case-insensitive
  contains, across the **whole library**, server-side, never just the loaded page. Ahead of
  launch's 236 real articles arriving at once (analysis-roadmap §5.3-6), this is how staff
  will actually find one. A new `ListOptions.search?: string` carries the term into both
  repositories identically: the live repository maps it to Strapi
  `filters[title][$containsi]`, composed with the existing type/status/`filters` merge in
  `buildFilters`; the demo repository applies the same case-insensitive contains in
  `applyFilter`, before paging — so live and demo behave identically. The input is debounced
  300 ms (the `MediaLibraryGrid` precedent) and, like the existing Type filter, resets the
  pager to page 1 on every change. A non-empty search with zero matches now renders a
  distinct "No ⟨type⟩s match "⟨term⟩"" message instead of the generic no-content empty
  state. Spec: `docs/superpowers/specs/2026-07-16-title-search-design.md`.

_Fixed_

- **`ContentList` stale-response race (generation guard).** `fetchPage()` — the one function
  backing all three of the list's reactive triggers (page, Type filter, and now title
  search) — gained a monotonic generation counter (mirroring `MediaLibraryGrid`'s Load More
  guard) so a slow response can no longer resolve after, and silently clobber, a fresher
  one. The race pre-dates this feature (a fast page-then-type sequence could already
  interleave); title search added a third trigger through the same function, which is what
  surfaced it — one counter at the shared call site closes it for all three triggers at
  once.
- **Filters serialized as JSON on the wire, not Strapi's bracket-key query params (CRITICAL,
  whole-branch review).** `repository.ts` was passing `query: { filters: { title: { $containsi:
  ... } } }` — a nested object — straight to the plain `ofetch` client, which has no custom
  query serializer; `ofetch`/`ufo` JSON.stringifies any non-scalar query value, so the wire
  carried `filters=%7B%22title%22...%7D`. Strapi 5's qs-based query parser rejects a STRING
  `filters` param, so **every live-mode filtered list call would have errored** — latent since
  the `type` filter and the `studio-profile` author-email lookup shipped in earlier releases,
  masked because unit tests mock `$Fetch` at the call boundary and never exercise real query
  serialization; caught by the whole-branch final review, not by any of those tests. Fixed with
  a new `flattenFilters()` helper (`app/lib/strapi-rest.ts`) that recursively converts nested
  filter objects into flat bracket-key params (`filters[title][$containsi]=x`) — the same shape
  already validated against the live sandbox for the Media Library (`lib/upload.ts`'s
  `filters[name][$containsi]`). `repository.ts` now spreads the flattened params into the query
  instead of nesting a `filters` object; every caller that filters through the generic
  repository (title search, the type filter, `studio-profile`'s `findByAuthorEmail`, and the
  Strapi `review-annotation` store) is fixed by this one change, since all of them flow through
  the same `createRepository()`. Final live confirmation is a staging-rehearsal curl check
  (`docs/demo-to-production.md` §2).

Built test-first over three reviewed tasks (per-task adversarial review); the whole-branch review caught the filter wire-format defect pre-merge, and the feature was verified live in the demo. Suite: **822
tests / 107 files** (800 + 12 new, + 10 in the wire-format fix round), typecheck clean.



## [0.6.0] - 2026-07-16

_Added_

- **Unsaved-work guard (local draft backup).** Authors can no longer silently lose
  in-progress work. Three protections now wrap all three content forms — Article, App,
  Dataset, both create and edit: (1) a native **leave-page warning** (`beforeunload`),
  plus a native `confirm` on in-app navigation away from a dirty form (a route-leave
  guard registered through the router's own active-route mechanism — no custom modal, no
  new a11y surface); (2) a **30-second local snapshot** of the in-progress draft while
  dirty, written to `localStorage` under a per-draft key, plus a best-effort final
  snapshot on `beforeunload` — snapshots are byte-capped (~1 MB, measured with
  `TextEncoder`) and **fail open** on any storage problem (full, blocked, or absent
  `localStorage` never breaks editing; the write is skipped with a console warning); (3) a
  non-blocking **restore banner** (`role="status"`) shown whenever a surviving snapshot is
  found — "Unsaved changes from ⟨time⟩ found," with "Restore" / "Discard" buttons. Every successful save
  clears the snapshot, so a surviving one always means real unsaved work; Restore applies
  the backup (leaving the form still unsaved, saved normally afterward); Discard drops it.
  **Live builds only take snapshots — the public demo deliberately takes none** (user
  decision: the demo's "nothing is saved / resets each session" promise stays literally
  true; the demo still gets both warnings). Spec:
  `docs/superpowers/specs/2026-07-16-unsaved-work-guard-design.md`.

Built test-first over six reviewed tasks (per-task adversarial review). Suite: **800
tests / 107 files** (757 + 43 new), typecheck clean. Verified end-to-end in the running app before merge (snapshot, restore, clear-on-save, and
the demo zero-write policy all observed live).

## [0.5.0] - 2026-07-16

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

- **Body-images tray no longer auto-seeds sample figures in demo.** The demo's 11 sample
  figures now live in the demo media library, one click away via **Add from library** —
  new articles start with an empty tray everywhere.

Built test-first over ten reviewed tasks (fresh implementer + adversarial reviewer per task;
five review findings fixed and re-verified along the way, including request-race guards now
shared across all four async media flows and a proper WAI-ARIA tabs primitive). Verified
end-to-end in the running demo before merge — library pick, alt write-back round trip,
add-from-library → Insert, and a real desktop upload rendering from its `blob:` URL.

Suite: **757 tests / 104 files** (690 + 67 new), typecheck clean.

## [0.4.0] - 2026-07-16

_Added_

- **Manager-docs workflow (hub v0.24.0 parity).** Managers monitoring the project can now
  always see what's changed, what's in flight, and what's next, without asking a developer:
  - **`ROADMAP.md`** (repo root) — a living roadmap in the hub's exact format (Done (recent) /
    In progress / Next (proposed) / Deferred / Blocked on R&A), opening with a
    `Last updated · Current version` line. Seeded truthfully from the 2026-07-16 planning
    decision (media-library picker in progress; author-protection items next).
  - **Version-stamped bottom navs** in the four manager-facing docs (README, Design Spec,
    Analysis & Roadmap article, ROADMAP) — current version + absolute GitHub `blob/main`
    links (Spec & status · Changelog · Roadmap · README · Live demo) that always open the
    latest rendered document, including from the Word editions (plain external hyperlinks —
    never Word field codes).
  - **"What's changed recently"** digest section in the Design Spec.
  - **In-app bottom status bar** (`AppStatusBar.vue`, hub port) — version pill
    (`runtimeConfig.public.version` ← package.json) + Spec & status / Changelog / Roadmap /
    Repository links. Pure links, no fetches — the demo CSP is unaffected.
  - **In-app `/spec` page** (hub port) — renders the Design Spec through the same
    markdown pipeline as article bodies (build-time `?raw` import; the pipeline's
    `html:false` + attr-allowlist guarantees carry over; source is this repo's own doc,
    fixed at build), with `.md`/`.docx` downloads copied to `public/spec/` by
    `scripts/copy-spec.mjs` on every dev/build/generate (`public/spec/` git-ignored).
    Marked `public` — readable before sign-in; the sources already live in a public repo.
  - **Docs-currency guard test** (`tests/unit/docs-nav.test.ts`) — the "always update the
    roadmap/docs" rule enforced as a failing test: nav markers present, every version stamp
    equal to package.json. Stale docs now fail the suite and CI.

_Fixed_

- **Vitest no longer scans `.claude/` worktrees.** The first session worktree ever created
  under `.claude/worktrees/` surfaced 97 phantom file-level failures in the parent
  checkout's run (worktrees carry `tests/` but no `node_modules`); `vitest.config.ts` now
  excludes `.claude/**`, and `.claude/worktrees/` is git-ignored.

Suite: **690 tests / 100 files** (677 + 13 new), typecheck clean, demo `generate` verified
locally with the new `/spec` assets bundled.

### 2026-07-11 (post-0.3.0)

_Changed_

- **Copperhead program alignment.** The Hub 2.0 modernization now carries the internal codename **Copperhead** (Illinois-native snake; the codename never reaches the public — at launch it simply becomes the ICJIA Research Hub). The GitHub repo was renamed `hub-studio-2026` → **`copperhead-studio-20`** (sibling of `copperhead-hub-20`, the public-site rewrite); `package.json` name and the local git remote follow. Doc filenames now mirror the hub project's pattern: the Design & Implementation Spec is **`docs/ICJIA-Studio-20-rewrite-copperhead.md/.docx`** and the Analysis & Launch Roadmap is **`docs/ICJIA-Studio-20-analysis-roadmap-copperhead.md/.docx`** (git-mv'd; all references updated; both Word editions regenerated). README gains a "Naming: Copperhead" section with the rationale; the spec header and roadmap article carry the naming note. Historical changelog entries keep the old filenames they shipped under.

_Added_

- **Body markdown linter merged** (`feat/body-lint-and-image-reset` → `main`, user decision; the branch had been recovered from the reflog earlier today). Pure `lintMarkdown()` (`app/lib/editor/markdown-lint.ts`: H1-in-body, heading-increment, empty-heading, image-alt-missing, empty-link-text) + the editor's **Check** button and results panel with jump-to-line; both tasks review-approved 2026-07-08. Suite: **677 tests / 97 files** (67 unit + 30 Nuxt), typecheck clean. README/spec/roadmap counts refreshed.

_Changed_

- **CI actions bumped `checkout`/`setup-node` v4 → v5.** The first CI run (green across all three jobs) carried GitHub's "Node.js 20 is deprecated on runners" annotation against the v4 actions; v5 targets the Node 24 runners and clears it.

## [0.2.0] - 2026-07-11

### 2026-07-11

_Added_

- **Analysis & Launch Roadmap article** (`docs/ICJIA-Research-Hub-Studio-2026-Analysis-and-Launch-Roadmap.md` + `.docx`) — dual-audience (managers + developers) assessment of the app as of `main` @ `d78a7ab`: fresh verification evidence, strengths analysis, ranked improvement recommendations (CI pipeline, noindex, autosave/unsaved-work guard, edit-conflict detection, list search, monitoring, staging Strapi-host override, a11y riders, E2E suite), the demo-vs-live cutover picture with the public demo link, a phased roadmap anchored to the demo-weeks → early-Aug-2026 timeline, a risk register, and the management decision list. The **Word edition is a compiled report**: a linked, in-document table of contents (static internal links — no Word field-update prompt on open) plus the Design Spec, Security Audit, and cutover runbook bundled as Appendices A–C (built by `scripts/build-word-edition.mjs`).
- **CI pipeline** (`.github/workflows/ci.yml`, roadmap §5.2-1): every push to `main` and every PR runs typecheck + the full suite, a production `nuxt build`, and the demo `nuxt generate` (with the demo header overlay). Includes the audit-recommended dev-bypass bundle guard (`scripts/check-dev-bypass.mjs`, 9 unit tests): a **positive control** asserts the sentinel IS in the demo bundle (the scan can never rot), and the production **absence check ships as a commented launch gate** — enabled in the PR that deletes `app/lib/dev-auth.ts` (runbook §6), since pre-launch the bypass deliberately ships-but-unreachable.
- **Search-engine exclusion** (roadmap §5.2-2; runbook §3 "optional hardening" → done): `X-Robots-Tag: noindex` in BOTH header sets + a deny-all `public/robots.txt`, guarded by 3 new unit tests in `security-headers.test.ts`. Suite now **661 tests / 96 files**.

_Changed_

- **Documentation currency pass** (roadmap §5.2-3): README (661 tests, CI section, noindex, corrected "tree-shaken" → ships-but-unreachable per the runbook's earlier correction — build-verified today; repo-layout tree includes `.github/`, `scripts/`, `robots.txt`, the new article); **Design Spec** revised 2026-07-11 (661 tests, all four audits, public-demo link + Author/Editor verify instructions, annotations/tab-preview/card-view/tour sections, §4 launch table incl. `review-annotation` install + runbook pointer, §7.5 "planned" → shipped, D-2 marked fully fixed); **security-audit.md** gains a dated post-audit delta log (rel=opener pinning, noindex, CI bundle guard, build-verified sentinel posture, 661-test totals); **runbook** notes noindex done + the CI launch-gate procedure.

_Fixed_

- **Recovered the orphaned body-linter branch.** The completed, review-approved body-linter work from 2026-07-08 (spec/plan + `lintMarkdown()` + editor Check UI, commits `5558c6d..8199b8a`) had its branch deleted unmerged and unpushed — the commits survived only in the local reflog and were headed for garbage collection. Restored the branch pointer as `feat/body-lint-and-image-reset` @ `8199b8a`; merge/reject decision and a push to origin still pending (see the roadmap article §5.1).

### 2026-07-05

_Fixed_

- **Studio-opened previews really do close now — no more duplicate editors** (user report 2026-07-05, second sighting). The §"Close preview vs Back to editor" branch shipped earlier today keyed on `window.opener`, but NuxtLink applies a fallback `rel="noopener noreferrer"` to **any** link with a `target` — named tabs included — so every preview tab opened from the Studio had its opener severed and showed the navigate-away **Back to editor** button, turning the preview tab into a second live editor for the same draft. All eight Studio→preview links (both ContentList views + the two preview buttons in each of the three forms) now carry an explicit `rel="opener"` (same-origin authed page — no tabnabbing exposure; explicit `rel` beats NuxtLink's fallback). Verified end-to-end in a real browser: Studio click → tab shows **Close preview** → click closes the tab; double-click reuses one named tab; direct/shared-link visits (no opener) still get the in-place **Back to editor** fallback. Regression-pinned in `form-preview-links` + `content-list` tests (649 green).

- **Annotations Phase 2 — the Strapi adapter (spec §4b), dormant until launch.** `createStrapiAnnotationStore` implements the same `AnnotationStore` contract as localStorage against the `review-annotation` content type via the Content-Manager admin API: filtered + fully-paginated list (no silent 100-row cap), create returning the server row (the Strapi `documentId` becomes the annotation id), read-modify-write reply/resolve, delete, and a write-boundary validator that fires before any network call. New `lib/mappers/annotation.ts` (flattened-anchor mapping, defensive comments-JSON parsing), `lib/validators/annotation.ts`, `repositories/annotations.ts`. The seam in `useAnnotations` now selects by session: demo builds/sessions keep localStorage forever (zero-network audit posture untouched — the public demo is byte-for-byte unaffected); a real signed-in session gets shared, server-stored threads. 18 new tests.
- **Runbook verification pass:** every claim audited against the code; added the missing steps it surfaced — Strapi CORS for the Studio origin, an explicit **staging-writes-to-production-Strapi** warning (`strapiBaseUrl` is hardcoded when the demo flag is unset) with test-content hygiene, first-login onboarding-gate check, custom-domain/DNS + HSTS step, optional `X-Robots-Tag: noindex`, and a pointer to the Phase-1 a11y hardening backlog. Corrected two rows (login bypass is unreachable, not stripped; sample-content shortcuts are local-dev-only, already absent from the deployed demo).
- **Demo → production cutover runbook** (`docs/demo-to-production.md`) — the exact path from the public demo to the live deploy: what flips automatically with the demo flag, Strapi-side install steps, the staging validation checklist, Netlify build/env configuration, the ~30-minute cutover sequence, rollback, and the documented launch-posture decisions (annotation freshness = refetch on open + after write; last-write-wins threads).

- **Expandable Live-preview modal — fullscreen by default.** The editor's Live preview now opens **fullscreen** (the most visual review surface); a **Restore/Expand** toggle in the modal header (all three content types) drops to the centered `max-w-6xl` dialog and back (UModal `fullscreen`).
- **Arming the highlighter auto-opens the comments rail.** The select→comment flow ends in a thread there, and the narrower prose column keeps the composer clear of the preview's edge. Deliberately asymmetric: disarming leaves the rail open — reviewers disarm to read or reply without accidental captures.
- **Armed-highlighter selection tint.** With the highlighter armed, the click-and-drag selection previews in the chosen highlight color (same four pastels as the saved marks) instead of the browser's default grey; unarmed selection stays native. Chromium renders the drag slightly translucent — a usable pending-vs-committed cue. Contrast stays AA: the preview surface is always light with near-black prose.

_Fixed (accessibility — full axe-core WCAG 2.1 AA sweep, light AND dark)_

- **Semantic color tokens darkened for light mode** (`--ui-primary` → 700, `--ui-success`/`--ui-warning` → 800; dark mode keeps the measured-clean 400s). Kills a family of AA contrast failures the sweep found: white labels on solid warning buttons (Unpublish, the demo-entry button — 1.91:1), color-on-tint soft chips and buttons (status chips, sample shortcuts, the rail's Resolve button, soft/outline primary labels — 1.7–4.3:1). All surfaces now measure 0 violations in both themes.
- **Type-list dropdown had no accessible name** (axe `button-name`, critical) — labelled.
- **Markdown editor host carried `aria-labelledby` on a generic div** (axe `aria-prohibited-attr`) — now `role="group"`.

_Added (later 2026-07-05)_

- **Word-style comment alignment.** Desktop comment cards now sit level with the passage they annotate — measured from the painted highlight, with overlapping cards pushed down by a pure collision pass (`lib/annotations/rail-layout.ts`) and re-measured on reflows (images, resizes, the rail mounting). Cards glide to new spots; clicking a card/highlight still cross-links the pair. A wider gutter separates the text column from the cards.
- **Clean view toggle** in the reviewer bar: read the article exactly as published — no highlights painted, no comments panel, review controls collapsed to the one toggle. Pure overlay; stored threads untouched.

_Added (later 2026-07-05)_

- **Fourth red/blue security audit** (§9 in `docs/security-audit.md`, summarized in the README's running log): the annotations/tab-preview/card-view surface. **0 Critical / 0 High / 0 Medium**; one defense-in-depth fix landed with the audit — card artwork `img src` is now scheme-pinned through the `safeHref` allowlist (bad schemes render the placeholder; regression-tested). Measured WCAG contrast on every new card element: 5.78–17.83:1 across light AND dark (AA floor 4.5) — Published badge 7.13/10.02, red Draft badge 6.42/6.17.
- **README currency pass:** four-audit summary, 647-test totals (95 files: 65 unit + 30 Nuxt) with expanded coverage lists, new feature sections (tab-only preview + Close-vs-Back behavior, Word-style reviewer annotations, card view lists), the Strapi drop-in and cutover runbook in the structure tree, and the 2026-06-22 audit moved into the collapsed history.
- **Card view polish:** the Draft badge is now **red** (green = published, red = draft — a go/stop read at a glance; light-mode `--ui-error` darkened to the 700 shade so the white-on-red badge clears AA, same discipline as the other tokens), and the **card artwork is clickable** — the image links to the editor with a proper accessible name.
- **Card view for content lists — and it's the default.** Every list (dashboard + manage, all three types) now opens as visual media cards: splash/image on the left with the **status badge riding the artwork corner** (Published/Draft at a glance), title + date + type chip + authors and a clean plain-text excerpt (markdown stripped via `lib/text-excerpt.ts`) on the right, plus the same tools as the table — Edit, Preview (named tab), and the publish toggle slot. A **Cards / List** toggle switches to the original columnar table; the choice persists per browser (`icjia-studio-content-view-v1`). Entries without an image get a quiet placeholder block. Measured 0 axe violations in both themes.

_Changed (later 2026-07-05, third pass — architecture simplification)_

- **The preview tab never duplicates the editor.** When the review page was opened *from* the Studio (it has a `window.opener`), the bar shows **Close preview** — closing the tab, since your editor is in the tab you came from. A shared-link visit (no opener — closing would strand the reviewer) keeps the **Back to editor** link, which navigates in place.

- **Preview is TAB-ONLY: the Live-preview modal is removed entirely** (user decision). Every preview entry point — the editor's **Live preview** / **Preview as published** buttons and the content list's **Preview** action — opens the standalone review page in a **per-document named tab** (`studio-preview-{id}`), so repeated clicks reuse and refresh one preview tab instead of piling up. Unsaved create-mode disables the button ("Save the draft first to preview"); save just saves. One surface = no modal-vs-page confusion, browser-native close/switch, editor-and-preview side-by-side on wide screens; the review page keeps annotations, Clean view, Back to editor, and Copy share link. Removes the UModal blocks from all three forms and the `.preview-modal-light` scope; the whole modal bug class (dark-mode chrome, fullscreen composition, scale-animation measurement) goes with it.

_Changed (later 2026-07-05, second pass)_

- **Saving a draft now opens the fullscreen preview modal — never the standalone page.** Edit-mode saves open it in place; a first-time create moves to the new `/edit/...` route and reopens the modal there (`?preview=1` hand-off), so "save" feels identical in both modes and the modal/page confusion is gone. The standalone page remains the shareable reviewer URL (Live preview view, the list's Preview action).
- **Fullscreen preview keeps prose and comment cards composed together** (centered `max-w-6xl`) instead of letting the cards drift to the far right edge of wide screens, and the reviewer bar now sits flush under the modal header (the padding gap is gone).

_Fixed (later 2026-07-05, second pass)_

- **Alignment hardening for the Word-style cards:** mark offsets are stored in layout pixels (any ancestor transform scale — e.g. the modal's open animation mid-flight — is divided out), only >1px changes republish (no oscillation), a slow self-heal re-measure runs while the rail is open, and the modal scroll area reserves its scrollbar gutter so the bar appearing can never reflow the prose.

_Fixed (later 2026-07-05)_

- **The shareable preview page is no longer a dead end.** Saving a draft lands on `/preview/{type}/{id}` (and the modal's Live-preview-view link opens it in a tab) with no way back — the reviewer bar now leads with **Back to editor** and **Dashboard** links.
- **Saving an annotation no longer yanks the preview to the top.** The rail scrolled the just-created active card into view before its aligned position was measured (it transiently sat at 0). Aligned cards land beside their highlight — exactly where the reader already is — so that scroll is skipped until the card's top is known.

- **Preview-modal controls invisible in dark mode.** The modal surface is pinned white (the published look), but dark mode flipped the semantic tokens to light-on-dark — making Restore/Close/link chrome light-on-white. A `.preview-modal-light` scope re-declares the light token set inside the modal (custom-property proximity wins), and the annotation card/composer surfaces moved from literal `dark:` classes to semantic tokens so they follow whichever scope they render in. Modal + preview page re-measured: 0 axe violations, both themes.

_Changed_

- **Live preview opens with comments hidden** (user decision): the preview starts as a clean read; the rail appears via Show comments, opening a highlight, or arming the highlighter. Also keeps the mobile drawer from covering content on load.
- **Clearer comments toggle.** The reviewer bar's "Comments (n)" button is now an explicit **Hide comments (n) / Show comments (n)** toggle with `aria-expanded` and panel open/close icons.
- **"Review view" → "Live preview view".** The modal-header link to the shareable `/preview/{type}/{id}` page is renamed to stay consistent with the Live preview button naming.

_Fixed_

- **Comment composer no longer clips at the preview modal's edges.** Inside the modal, `position: fixed` anchors to the dialog (its `translate` creates the containing block; its `overflow-hidden` clips), so the composer's viewport-only clamps let bottom/right-edge selections cut the popover off. Placement math is extracted to `lib/annotations/composer-position.ts`: it detects the containing block, clamps to viewport ∩ dialog, and converts coordinates — unchanged behavior on the standalone `/preview` page.

### 2026-07-04

_Added_

- **Reviewer-annotations design spec** (`docs/superpowers/specs/2026-07-04-reviewer-annotations-design.md`) — approved design for Word-style review on the `/preview` draft page: highlight a passage, attach threaded comments, pick a highlight color, resolve/reopen. Pure overlay (never touches the article markdown or publish pipeline). Anchoring via text-quote selectors; painting via accessible `<mark>` elements; storage behind an `AnnotationStore` seam — `localStorage` for the demo weeks, a Strapi 5 `review-annotation` collection type (drop-in schema included in the spec) for production. Implementation to follow.
- **Reviewer annotations on the draft preview (Phase 1).** On `/preview/:type/:documentId`, any signed-in user can highlight a passage (4 colors), attach a comment, reply in threads, and resolve/reopen — Word-style review for drafts. Highlights are anchored by quote (survive edits elsewhere; orphaned threads stay listed as "text changed"), painted as accessible `<mark>` elements (keyboard + screen-reader reachable), excluded from print, and stored in versioned `localStorage` (`icjia-studio-annotations-v1:*`) behind an `AnnotationStore` seam — zero network calls, demo posture unchanged. The article markdown is never modified. Phase 2 (Strapi 5 persistence) ships as a drop-in content type under `deploy/strapi/review-annotation/` with an install guide.
- **Annotations in the editor's Live-preview modal + "Review view" link (spec Addendum A).** The whole annotation overlay was extracted into a reusable `<AnnotatedPreview>` component, so the editor's **Live preview / Preview as published** modal now carries the same tools and the same threads as the `/preview` page for **saved** entries (all three content types); unsaved create-mode previews stay plain (no stable id to key threads to). The modal header gains a **Review view** link opening the shareable `/preview/{type}/{id}` page in a new tab. The reviewer bar is now **sticky** (pinned under the app nav on the page; to the top of the modal's scroll area), fixing it scrolling out of reach on long articles.

_Changed_

- **Dev server: dependency pre-bundling.** CodeMirror, markdown-it (+ plugins), KaTeX, and DOMPurify are pre-bundled via `vite.optimizeDeps.include`, eliminating Vite's lazy-discovery full-page reloads on the first editor/preview visit in dev. Production builds unaffected.

## [0.1.0] - 2026-06-22

The core Studio is built and working in development (pre-launch). Highlights since the design phase.

### Public demo & authoring polish — 2026‑06‑20 → 2026‑06‑22 (newest first)

_Added_

- **Article type on the content list + a type filter.** Each article row now shows a **Type chip** (the stored enum rendered in plain words — `annualReport` → "Annual report", `researchAtAGlance` → "Research at a glance"), and a **Type dropdown** above the list filters by type. The filter runs **across all articles through the repository** — not just the loaded page — and re‑paginates from page 1; **All types** clears it. The list shows everyone's articles (published + drafts together), so the dropdown sweeps the full set. Demo seed now spreads articles across **all 14** article types so every option has matching content. (The onboarding tour's content‑list step was reworded to match — it no longer implies the list is only your own drafts.)
- **Guided onboarding tour** — a first‑run, skippable walkthrough on the dashboard. Two intro slides ("What is the ICJIA Research Hub 2.0?" and "Why Markdown?") then role‑aware spotlight steps (Create, your content list, the role badge, the light/dark toggle, the demo banner, and — **editors only** — the Publish queue). Auto‑starts once per browser (versioned `localStorage` key), dismisses on Esc / backdrop / Skip, and replays anytime from **Tour** in the top nav. Built from the [ICJIA `nuxt-guided-tour`](https://github.com/ICJIA/nuxt-guided-tour) runtime **ported into the app as plain code** under a renamed `useGuidedTour` composable — deliberately not the npm module, so it can never collide with Nuxt UI's own `useTour`. Tour icons are bundled lucide (no runtime Iconify fetch under the demo CSP).
- **Demo role comparison** — enter the demo as **Author** or **Editor**: an author drafts & previews while the Publish/Unpublish control is **hidden entirely** (it never renders for them); an editor also publishes. A single clickable **role chip** in the navbar shows your role and explains it.
- **Multiple Main Files** — drop one or more **PDFs** (max 3, configurable in `studio.config.ts`), each listed by filename; the published preview shows a distinct **download button per file** under the Table of Contents. Main‑file type defaults to **PDF**.
- **Live Publish/Unpublish in the demo** — toggling updates the article lists and the publish queue live for the session (shared in‑memory store; resets on reload).
- **Sticky article toolbar** under the main nav — article title (truncating) + **Live preview** + color‑coded **Publish/Unpublish** (soft‑blue preview, green publish, amber unpublish), visible while scrolling.
- **Inline research figures** — synthetic chart/table SVGs in every demo article (≥1 each); a sidebar body‑image insert panel (alt required, caption optional, position above/below/none, align center/left); **Add Author** (max 10).
- **Markdown extras** — `markdown-it-attrs` (class/id allowlist), centered images & tables, and figure captions (above/below, center/left).
- **Demo login & onboarding** — a dismissable session demo banner; a "new user → contact **Research & Analysis**" note (no live signups) shown in every build; an illustrative (non‑functional) sign‑in form on the demo login.

_Changed_

- **Role UX — one clickable chip + publish hidden from authors.** The navbar now shows a single, keyboard‑accessible **role chip** — **Editor** (blue) or **Author** (neutral) — replacing the "Dev Editor" name + separate "Publisher" badge; clicking it opens a plain‑language permissions popover written for non‑technical R&A staff. Publish/Unpublish is now **hidden entirely** for authors everywhere (default‑deny — the control simply doesn't render), reverting the earlier dimmed‑with‑"editors only" approach. User‑facing terminology is **"Editor"** consistently (no more "Publisher"); the publishing superadmin still reads as "Editor". The label + permissions text live in a pure, unit‑tested helper (`roleLabel` / `rolePermissions` in `lib/admin-roles`). Internal `canPublish` and role codes are unchanged.
- **Splash image** uses Strapi's `large_` format and renders **edge‑to‑edge** (full‑bleed) above the article body, with the body text/TOC kept inset & readable.
- **`studio.config.ts`** — central, non‑secret config (app name, Strapi URL, demo mode, `maxMainFiles`) surfaced via `runtimeConfig.public`.
- Varied demo article spread — distinct titles, a realistic figure distribution (none / one / 2–3), Markdown tables, and top/bottom/no captions.

_Fixed_

- **Markdown preview legible in dark mode.** The in‑editor split‑pane preview and the standalone `/preview` page now render the published prose on a **white surface** in both light and dark mode — the published article is always on white, so in dark mode the near‑black prose was previously dark‑on‑dark and unreadable.
- **Dark‑mode contrast → WCAG 2.1 AA.** The dim blue‑on‑dark controls now meet AA: the dashboard **New article / New app / New dataset** and **Open queue** buttons switched from the low‑contrast `subtle` primary variant to **solid** (white‑on‑blue in light, dark‑on‑blue in dark; ~5–7:1, passes both modes — was ~4:1), and **`--ui-primary` is brightened to blue‑400 in dark mode** (`:root.dark`) so all blue‑on‑dark text/links — the **Edit / Preview** row actions and article‑title links — clear AA (was ~3.4:1, now ~6.8:1). Verified with contrastcap (dashboard 201/201, login 14/14). Light mode unchanged (primary stays blue‑600).
- Login note switched to high‑contrast text (WCAG AA; was low‑contrast gray). Demo article‑title year ranges always render ascending. Netlify deploy targets `dist/` (Nuxt's static output), fixing the publish‑dir error.

_Security_

- **Red/blue team audit of the demo‑roles / Main‑Files / guided‑tour / dependency surface (§8, 2026‑06‑22)** — 0 Critical / 0 High / 0 Medium. Confirmed: publish/unpublish enforced server‑side (Strapi 403) with the UI gate as default‑deny defense‑in‑depth; demo identities dev/demo‑only (tree‑shaken from prod); Main‑File download links pass through `safeHref` and the array mapper is numeric/type‑strict; the guided tour has zero `v-html` and a namespaced+versioned `localStorage` key; markdown stays `html:false` with an `id`/`class`‑only `markdown-it-attrs` allowlist; both CSP sets intact; `npm audit` clean (1 known dev‑only esbuild Low). Two defense‑in‑depth fixes: **deep‑freeze `runtimeConfig.public`** so devtools can't flip `demoMode` to disarm the write‑guards (F‑1, the §7 D‑2 residual), and a **CI guard on the demo CSP** `connect-src 'self'` (F‑2).
- **Red/blue team audit of demo mode + public deploy** (findings D‑1…D‑10, all remediated): blanked the dev Strapi URL in the demo, in‑memory‑only with a hard write‑block, bundled icons (no runtime fetch under a tight CSP), an `isDemoData` read‑guard, and a Permissions‑Policy header. Audit log ordered newest‑first.

_Build / dependencies_

- **Refreshed the stack to current within majors** — manifest floors raised to match the resolved tree: **Nuxt 4.4.8**, **Vue 3.5.38**, **@nuxt/ui 4.9.0**, **Vitest 4.1.9**, **@vue/test-utils 2.4.11**, **happy‑dom 20.10.6** (Pinia 3 / @pinia/nuxt / persistedstate, vue‑router 5, TypeScript 6, vue‑tsc 3, the CodeMirror/Lezer + markdown‑it families, dompurify, and @vscode/markdown‑it‑katex were already at latest). `markdown-it-attrs` **stays pinned at 4.5.0** (v5 breaks Vite interop). Dropped the deprecated **@types/dompurify** stub (dompurify ships its own types). 514 tests + typecheck (0 errors) + demo `generate` green; dashboard and an edit page render with no error boundary.
- Public **demo deploy** on Netlify (`NUXT_PUBLIC_DEMO_MODE`) — fully self‑contained, demo‑login‑only, no secrets, no Strapi writes.
- Bumped **vue‑router 4→5, TypeScript 5→6, vue‑tsc 2→3** (vue‑router 5 is what Nuxt 4 expects; the bump also cleared a recurring Volar warning).
- Dependabot **groups** so coupled packages move together: the Pinia family, and vue‑router + vue‑tsc.

---

### Added

- **Authentication** — Strapi 5 admin sign-in (JWT bearer, persisted in a `SameSite=Strict`/`Secure` cookie), boot-time session re-verification, a default-deny route guard, a login page, and a protected dashboard.
- **Content authoring** — create/edit **Articles, Apps, and Datasets** as drafts, with a validate-before-write save-gate and columnar forms (writing column + a Details sidebar).
- **Markdown editor** — the vendored ICJIA Markdown Editor (CodeMirror 6) with a formatting toolbar (bold/italic/code, an H1–H3 dropdown, lists, quote, code block, rule, link, image, undo/redo) styled as raised 3D buttons, a live "exactly-as-published" preview toggle, and a zero-base64 image pipeline (paste/drop/upload → hosted URL).
- **Abstract** as a compact, inline-only markdown editor (no references; links open in a new window); **App description** as a full markdown editor.
- **Media handling** — required alt-text + optional caption, a clear selected-state (thumbnail + filename + Replace/Remove, no native "no file chosen"), a `file` kind for PDF/document uploads (no alt/caption), and a **body-image gallery** (upload → thumbnails → insert at the cursor).
- **Published preview** — faithful Research Hub styling (Oswald + Georgia), a bordered abstract, an all-authors byline, a print button, About-the-Authors / Funding / Suggested-Citation end matter, and a **sticky Table of Contents** (from `h2` headings, with AST-derived ids). Available as a modal from the form and as a shareable `/preview/:type/:documentId` page with **Copy share link**.
- **Content list** — paginated and sortable (newest first) with Date · Title · Author(s) · Draft/Published status.
- **Sample content** — one-click "Add sample article / app / dataset" that fills a complete, realistic, **100%-phony** draft (lorem ipsum + made-up names), full-length with working footnote references.
- **Demo mode** (dev `admin/admin`) — 200+ in-memory, full-length sample articles in a paginated list; nothing is ever saved to the server.
- **Onboarding** — a first-login author-profile gate (fail-open; publishers exempt) with reviewer prefill.
- **Publish & review email** — a `canPublish`-gated Publish (Strapi Content-Manager publish action), an auth-gated, **rate-limited** Nitro `request-review` route that emails the preview link via Mailgun, and a publish → site-rebuild webhook.
- **Theme & branding** — a light/dark toggle (defaults to light) and the official ICJIA logo in the nav + login.
- **Security headers** — `public/_headers` (CSP + `nosniff`, `X-Frame-Options: DENY`, HSTS) and a Dependabot config.

### Changed

- Authentication and content access moved from the public REST API to **Strapi's admin Content-Manager API** once the publish roles were confirmed.
- A modern, high-contrast theme (Inter, WCAG AA contrast), crisper corners, and horizontal (columnar) forms.
- **Docs** — the [Design & Implementation Spec](docs/ICJIA-Research-Hub-Studio-2026-Design-and-Implementation-Spec.md) refreshed for a skeptical, non-technical manager (TL;DR, verifiable "receipts," a Security section); the README now leads with a 30-second TL;DR and adds a developer reference plus a running security-audit log.

### Fixed

- Accessibility label associations (dropped a dangling `for`, aria-labelled the editor).
- Kept the session across transient/`5xx` boot errors (the 401 interceptor handles real auth failures).
- The content list sorts by article date (newest first).

### Security

- **Independent red/blue team audit (2026-06-21)** — 0 critical findings; every in-repo finding fixed and covered by automated tests (375): CSP/security headers, review-email rate-limiting, AST-based escaped TOC ids, a dataset URL-scheme gate, a hard zero-base64 write guard, and 403-clears-session. Full report in [`docs/security-audit.md`](docs/security-audit.md), with a running log in the README.
- The dev `admin/admin` bypass is **dev-only** (statically tree-shaken from production builds), clearly labeled on the sign-in screen, and documented in the audit (to be removed before launch).

### Notes

- Pre-launch: remaining work is Strapi/email configuration (Research & Analysis), a deploy-preview CSP check, and removing the dev bypass — not new construction.
- Backend (Strapi 5) is managed separately and must not be modified without coordination.

[Unreleased]: https://github.com/icjia/hub-studio-2026/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/icjia/hub-studio-2026/releases/tag/v0.1.0
